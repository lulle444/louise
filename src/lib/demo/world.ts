import { MockMarketDataProvider } from "@/lib/data/mock-provider";
import { mulberry32, hashString, pick } from "@/lib/prng";
import { RACE_FORMULA_VERSION } from "@/lib/scoring/race-score";
import { lockXp, applyAwards } from "@/lib/scoring/xp";
import { lockAiLineups } from "@/lib/services/ai-lineups";
import { settleRace } from "@/lib/services/settlement";
import { snapshotOfKind, takeRaceSnapshot } from "@/lib/services/snapshots";
import { DemoStore, emptyState } from "@/lib/store/demo-store";
import type { AdminActor } from "@/lib/store/types";
import type { LineupPick, NarrativeSnapshot, Profile, Race } from "@/lib/types";
import { buildCatalogue } from "./catalogue";
import { DEMO_USERS } from "./users";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
export const SNAPSHOT_INTERVAL_MS = 6 * HOUR;

export const DEMO_ACTOR: AdminActor = { id: "system_demo", label: "Demo seeder" };

const THESES = [
  "Volume is rotating in before price — classic early signal.",
  "Breadth has been improving for two weeks; the crowd hasn't noticed.",
  "Fading the consensus here. Too crowded at the top.",
  "Momentum consistency is the tell — every dip is bought.",
  "Underdog with improving breadth. Wildcard material.",
  "Sector rotation usually follows liquidity. Watching L2s closely.",
  "Betting on mean reversion after a rough week.",
  "The narrative everyone forgot is the one that runs next.",
  "Conviction sized to what the data actually shows.",
  "Contrarian Leader, consensus Challenger, safe Wildcard.",
];

/** Deterministic id factory so demo ids survive rebuilds. */
export function demoIdFactory(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix: string) => {
    const n = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, n);
    return `${prefix}_d${n.toString(36).padStart(4, "0")}`;
  };
}

export interface DemoWorld {
  store: DemoStore;
  provider: MockMarketDataProvider;
  makeId: (prefix: string) => string;
  builtAt: string;
  liveRaceId: string;
  openRaceId: string;
  /** Advance live snapshots up to `nowIso`. */
  advance(nowIso: string): Promise<void>;
}

export function demoTimeline(nowIso: string): { raceStarts: number[]; liveIndex: number; openIndex: number } {
  const now = Date.parse(nowIso);
  const dayStart = Math.floor(now / DAY) * DAY;
  const liveStart = dayStart - 3 * DAY;
  const raceStarts: number[] = [];
  for (let k = 0; k < 6; k++) raceStarts.push(liveStart - (4 - k) * 7 * DAY);
  return { raceStarts, liveIndex: 4, openIndex: 5 };
}

function raceAt(number: number, startMs: number, makeId: (p: string) => string): Race {
  return {
    id: makeId("race"),
    number,
    name: `Narrative Race ${number}`,
    status: "draft",
    publishedAt: null,
    locksAt: new Date(startMs - 2 * HOUR).toISOString(),
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(startMs + 7 * DAY).toISOString(),
    settledAt: null,
    voidReason: null,
    formulaVersion: RACE_FORMULA_VERSION,
    featured: false,
    isDemo: true,
  };
}

function generateHumanPicks(
  style: (typeof DEMO_USERS)[number]["style"],
  prelock: NarrativeSnapshot[],
  rand: () => number,
): LineupPick[] {
  const byRank = [...prelock].sort((a, b) => a.rank - b.rank).map((s) => s.narrativeId);
  const byMomentum = [...prelock].sort((a, b) => b.normalized.momentum - a.normalized.momentum).map((s) => s.narrativeId);
  const take = (pool: string[], used: Set<string>) => {
    const c = pool.find((n) => !used.has(n)) ?? byRank.find((n) => !used.has(n))!;
    used.add(c);
    return c;
  };
  const used = new Set<string>();
  let leader: string;
  let challenger: string;
  let wildcard: string;
  const jitter = <T>(arr: T[], k: number) => (rand() < 0.75 ? arr.slice(0, k) : arr.slice(1, k + 1));

  switch (style) {
    case "consensus":
      leader = take(jitter(byRank, 2), used);
      challenger = take(byRank.slice(1, 4), used);
      wildcard = take(byRank.slice(4 + Math.floor(rand() * 3)), used);
      break;
    case "momentum":
      leader = take(jitter(byMomentum, 2), used);
      challenger = take(byMomentum.slice(0, 4), used);
      wildcard = take(byRank.slice(4 + Math.floor(rand() * 4)), used);
      break;
    case "contrarian":
      leader = take(byRank.slice(2 + Math.floor(rand() * 3)), used);
      challenger = take(byRank.slice(0, 3), used);
      wildcard = take(byRank.slice(5 + Math.floor(rand() * 3)), used);
      break;
    case "wild":
      leader = take(byRank.slice(Math.floor(rand() * 4)), used);
      challenger = take(byRank.slice(Math.floor(rand() * 5)), used);
      wildcard = take([byRank[8 - Math.floor(rand() * 3)]], used);
      break;
    default:
      leader = take(jitter(byRank, 2), used);
      challenger = take(byMomentum.slice(0, 3), used);
      wildcard = take(byRank.slice(3 + Math.floor(rand() * 5)), used);
  }
  const l = 35 + Math.floor(rand() * 30);
  const c = 15 + Math.floor(rand() * Math.max(1, 70 - l));
  const w = 100 - l - c;
  return [
    { role: "leader", narrativeId: leader, energy: l },
    { role: "challenger", narrativeId: challenger, energy: c },
    { role: "wildcard", narrativeId: wildcard, energy: w },
  ];
}

async function ensureIntervals(world: { store: DemoStore; provider: MockMarketDataProvider; makeId: (p: string) => string }, race: Race, nowIso: string) {
  const now = Date.parse(nowIso);
  const start = Date.parse(race.startsAt);
  const end = Date.parse(race.endsAt);
  const existing = await world.store.listSnapshots(race.id);
  const taken = new Set(existing.filter((s) => s.kind === "interval").map((s) => s.takenAt));
  const last = Math.min(now, end);
  for (let t = start + SNAPSHOT_INTERVAL_MS; t <= last; t += SNAPSHOT_INTERVAL_MS) {
    if (t >= end) break;
    const iso = new Date(t).toISOString();
    if (taken.has(iso)) continue;
    await takeRaceSnapshot(world.store, world.provider, race, "interval", iso, world.makeId);
  }
  if (now >= end && !existing.some((s) => s.kind === "final")) {
    await takeRaceSnapshot(world.store, world.provider, race, "final", race.endsAt, world.makeId);
  }
}

/**
 * Build the complete deterministic demo world relative to `nowIso`:
 * four settled Races, one live Race, one open (upcoming) Race, nine
 * narratives, 14 demo users with lineups, AI lineups, results, XP and badges.
 */
export async function buildDemoWorld(nowIso: string): Promise<DemoWorld> {
  const makeId = demoIdFactory();
  const { raceStarts, liveIndex, openIndex } = demoTimeline(nowIso);
  const createdAt = new Date(raceStarts[0] - 14 * DAY).toISOString();
  const catalogue = buildCatalogue(createdAt);
  const provider = new MockMarketDataProvider(catalogue.mockConfigs);

  let clockValue = createdAt;
  const store = new DemoStore(emptyState(), makeId, () => clockValue);
  store.state.narratives = catalogue.narratives;
  store.state.versions = catalogue.versions;

  // Profiles
  for (const u of DEMO_USERS) {
    const profile: Profile = {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarSeed: u.username,
      bio: u.bio,
      createdAt,
      isDemo: true,
    };
    await store.upsertProfile(profile);
  }

  const races: Race[] = raceStarts.map((s, i) => raceAt(i + 1, s, makeId));
  store.state.races = races;
  const world = { store, provider, makeId };

  for (let i = 0; i < races.length; i++) {
    const race = races[i];
    const raceStart = Date.parse(race.startsAt);
    clockValue = new Date(raceStart - 6 * DAY).toISOString();
    await store.setRaceStatus(race.id, "published", DEMO_ACTOR);
    race.featured = i === liveIndex;

    // Reference + pre-lock snapshots (inputs for AI and starting ranks)
    await takeRaceSnapshot(store, provider, race, "reference", race.locksAt, makeId);
    const prelock = await takeRaceSnapshot(store, provider, race, "prelock", race.locksAt, makeId);

    // Human lineups
    const raceRand = mulberry32(hashString(`lineups:${race.number}`));
    for (const u of DEMO_USERS) {
      if (u.skips.includes(race.number)) continue;
      const rand = mulberry32(hashString(`lineup:${race.number}:${u.id}`));
      const picks = generateHumanPicks(u.style, prelock, rand);
      const lockedAt = new Date(Date.parse(race.locksAt) - (1 + Math.floor(rand() * 40)) * HOUR).toISOString();
      const lineup = await store.createLineup(
        { raceId: race.id, userId: u.id, picks, thesis: rand() < 0.7 ? pick(raceRand, THESES) : null },
        lockedAt,
      );
      lineup.createdAt = lockedAt;
      applyAwards(store.state.xp, u.id, race.id, [lockXp(u.id, race.id)], lockedAt, () => makeId("xp"));
    }

    if (i === openIndex) continue; // still open for lineups

    // Lock: AI lineups drafted from the pre-lock snapshot, race goes live.
    clockValue = race.locksAt;
    await lockAiLineups(store, race, race.locksAt, makeId);
    await store.setRaceStatus(race.id, "live", DEMO_ACTOR);

    await ensureIntervals(world, race, nowIso);
    if (Date.parse(nowIso) >= Date.parse(race.endsAt)) {
      clockValue = race.endsAt;
      await settleRace(store, race.id, DEMO_ACTOR, race.endsAt, makeId);
    }
  }
  clockValue = nowIso;
  // Restore a live clock for subsequent admin actions.
  store.setClock(() => new Date().toISOString());

  return {
    store,
    provider,
    makeId,
    builtAt: nowIso,
    liveRaceId: races[liveIndex].id,
    openRaceId: races[openIndex].id,
    async advance(now: string) {
      for (const r of store.state.races) {
        if (r.status === "live") await ensureIntervals(world, r, now);
      }
    },
  };
}

export { snapshotOfKind };

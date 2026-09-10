import "server-only";
import { aggregateCrowd } from "@/lib/scoring/crowd";
import { levelForXp, type LevelInfo } from "@/lib/scoring/levels";
import { computeMetaDNA, computePlayerStats, type PlayerStats } from "@/lib/scoring/meta";
import { totalXp } from "@/lib/scoring/xp";
import type { Session } from "@/lib/auth/session";
import type {
  AiProfile,
  CrowdPicks,
  Lineup,
  MetaDNA,
  Narrative,
  NarrativeSnapshot,
  Profile,
  Race,
  RaceResult,
  UserBadge,
} from "@/lib/types";
import { finalStandings } from "./settlement";
import { groupSnapshots, latestRaceSnapshot, previousRaceSnapshot, snapshotOfKind } from "./snapshots";

export interface StandingRow {
  narrative: Narrative;
  snapshot: NarrativeSnapshot | null;
  rank: number;
  previousRank: number | null;
  startRank: number | null;
  score: number;
  delta: number; // score change vs previous interval
}

export interface RaceView {
  race: Race;
  narratives: Narrative[];
  narrativeById: Map<string, Narrative>;
  phase: "open" | "live" | "settled" | "void" | "archived" | "draft";
  standings: StandingRow[];
  prelock: NarrativeSnapshot[];
  latestTakenAt: string | null;
  history: { takenAt: string; scores: Record<string, number> }[];
  lineups: Lineup[];
  humanLineups: Lineup[];
  aiLineups: Lineup[];
  aiProfiles: AiProfile[];
  userLineup: Lineup | null;
  crowd: CrowdPicks | null;
  crowdVisible: boolean;
  results: RaceResult[];
  userResult: RaceResult | null;
  profilesById: Map<string, Profile>;
  entrants: number;
}

export function racePhase(race: Race): RaceView["phase"] {
  if (race.status === "published") return "open";
  if (race.status === "live") return "live";
  if (race.status === "settled") return "settled";
  if (race.status === "void") return "void";
  if (race.status === "archived") return "archived";
  return "draft";
}

export async function getRaceView(session: Session, raceId: string): Promise<RaceView | null> {
  const { store, viewer } = session;
  const race = await store.getRace(raceId);
  if (!race) return null;
  if (race.status === "draft" && !viewer?.isAdmin) return null;

  const [narratives, snapshots, lineups, aiProfiles, results, profiles] = await Promise.all([
    store.listNarratives(),
    store.listSnapshots(raceId),
    store.listLineups(raceId),
    store.listAiProfiles(),
    store.listResults(raceId),
    store.listProfiles(),
  ]);
  const narrativeById = new Map(narratives.map((n) => [n.id, n]));
  const phase = racePhase(race);
  const prelock = snapshotOfKind(snapshots, "prelock");
  const latest = phase === "open" ? prelock : latestRaceSnapshot(snapshots).length ? latestRaceSnapshot(snapshots) : prelock;
  const previous = phase === "open" ? [] : previousRaceSnapshot(snapshots).length ? previousRaceSnapshot(snapshots) : prelock;
  const prevById = new Map(previous.map((s) => [s.narrativeId, s]));
  const startById = new Map(prelock.map((s) => [s.narrativeId, s]));

  const standings: StandingRow[] = [];
  for (const s of latest) {
    const n = narrativeById.get(s.narrativeId);
    if (!n) continue;
    const prev = prevById.get(s.narrativeId) ?? null;
    standings.push({
      narrative: n,
      snapshot: s,
      rank: s.rank,
      previousRank: prev?.rank ?? null,
      startRank: startById.get(s.narrativeId)?.rank ?? null,
      score: s.score,
      delta: prev ? Math.round((s.score - prev.score) * 100) / 100 : 0,
    });
  }
  standings.sort((a, b) => a.rank - b.rank);

  const history = groupSnapshots(snapshots)
    .filter((g) => g.kind === "prelock" || g.kind === "interval" || g.kind === "final")
    .map((g) => ({
      takenAt: g.takenAt,
      scores: Object.fromEntries(g.rows.map((r) => [r.narrativeId, r.score])),
    }));

  const humanLineups = lineups.filter((l) => l.kind === "human");
  const aiLineups = lineups.filter((l) => l.kind === "ai");
  const userLineup = viewer ? (lineups.find((l) => l.userId === viewer.id) ?? null) : null;
  const crowdVisible = Boolean(userLineup) || phase !== "open";
  const crowd = crowdVisible ? aggregateCrowd(humanLineups) : null;
  const userResult = viewer ? (results.find((r) => r.userId === viewer.id) ?? null) : null;

  return {
    race,
    narratives,
    narrativeById,
    phase,
    standings,
    prelock,
    latestTakenAt: latest[0]?.takenAt ?? null,
    history,
    lineups,
    humanLineups,
    aiLineups,
    aiProfiles,
    userLineup,
    crowd,
    crowdVisible,
    results,
    userResult,
    profilesById: new Map(profiles.map((p) => [p.id, p])),
    entrants: humanLineups.length,
  };
}

export interface LeaderboardRow {
  profile: Profile;
  xp: number;
  level: LevelInfo;
  stats: PlayerStats;
  bestNarrative: Narrative | null;
  dna: MetaDNA;
}

export interface LeaderboardOptions {
  window: "race" | "month" | "all";
  raceId?: string;
  specialty?: string; // narrative slug
}

export async function getLeaderboard(session: Session, opts: LeaderboardOptions): Promise<{ rows: LeaderboardRow[]; races: Race[] }> {
  const { store } = session;
  const [profiles, allResults, xp, narratives, races] = await Promise.all([
    store.listProfiles(),
    store.listAllResults(),
    store.listXp(),
    store.listNarratives(),
    store.listRaces(),
  ]);
  const settledRaces = races.filter((r) => r.status === "settled").sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  let scopedRaceIds = settledRaces.map((r) => r.id);
  if (opts.window === "race" && opts.raceId) scopedRaceIds = scopedRaceIds.filter((id) => id === opts.raceId);
  if (opts.window === "month") {
    const cutoff = Date.now() - 30 * 86_400_000;
    scopedRaceIds = settledRaces.filter((r) => Date.parse(r.endsAt) >= cutoff).map((r) => r.id);
  }
  const allOrder = settledRaces.map((r) => r.id);
  const lineupsByUser = new Map<string, Lineup[]>();
  const crowdByRace = new Map<string, CrowdPicks>();
  for (const r of settledRaces) {
    const lineups = await store.listLineups(r.id);
    crowdByRace.set(r.id, aggregateCrowd(lineups));
    for (const l of lineups) {
      if (!l.userId) continue;
      const arr = lineupsByUser.get(l.userId) ?? [];
      arr.push(l);
      lineupsByUser.set(l.userId, arr);
    }
  }

  const rows: LeaderboardRow[] = [];
  for (const p of profiles) {
    const mine = allResults.filter((r) => r.userId === p.id);
    const scoped = mine.filter((r) => scopedRaceIds.includes(r.raceId));
    if (!scoped.length && !mine.length) continue;
    const statsScoped = computePlayerStats(scoped, scopedRaceIds);
    const statsAll = computePlayerStats(mine, allOrder);
    const lineups = lineupsByUser.get(p.id) ?? [];
    const dna = computeMetaDNA({
      results: mine.sort((a, b) => allOrder.indexOf(a.raceId) - allOrder.indexOf(b.raceId)),
      lineups: new Map(lineups.map((l) => [l.id, l])),
      crowdByRace,
      narratives,
    });
    const bestNarrative = dna.bestNarrativeId ? (narratives.find((n) => n.id === dna.bestNarrativeId) ?? null) : null;
    if (opts.specialty && bestNarrative?.slug !== opts.specialty) continue;
    rows.push({
      profile: p,
      xp: totalXp(xp, p.id),
      level: levelForXp(totalXp(xp, p.id)),
      stats: { ...statsScoped, provisional: statsAll.provisional, metaRating: statsScoped.metaRating },
      bestNarrative,
      dna,
    });
  }
  rows.sort((a, b) => {
    if (a.stats.provisional !== b.stats.provisional) return a.stats.provisional ? 1 : -1;
    return b.stats.metaRating - a.stats.metaRating || b.stats.averageScore - a.stats.averageScore || b.xp - a.xp;
  });
  return { rows, races: settledRaces };
}

export interface ProfileView {
  profile: Profile;
  xp: number;
  level: LevelInfo;
  stats: PlayerStats;
  dna: MetaDNA;
  badges: UserBadge[];
  results: (RaceResult & { race: Race; lineup: Lineup | null })[];
  lineups: Lineup[];
  narratives: Narrative[];
  bestNarrative: Narrative | null;
  favoriteNarrative: Narrative | null;
  races: Race[];
}

export async function getProfileView(session: Session, username: string): Promise<ProfileView | null> {
  const { store } = session;
  const profile = await store.getProfileByUsername(username);
  if (!profile) return null;
  const [results, lineups, xpEntries, badges, narratives, races] = await Promise.all([
    store.listResultsForUser(profile.id),
    store.listLineupsForUser(profile.id),
    store.listXp(profile.id),
    store.listUserBadges(profile.id),
    store.listNarratives(),
    store.listRaces(),
  ]);
  const settled = races.filter((r) => r.status === "settled").sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const order = settled.map((r) => r.id);
  const crowdByRace = new Map<string, CrowdPicks>();
  for (const r of settled) crowdByRace.set(r.id, aggregateCrowd(await store.listLineups(r.id)));
  const sortedResults = [...results].sort((a, b) => order.indexOf(a.raceId) - order.indexOf(b.raceId));
  const xp = xpEntries.reduce((s, e) => s + e.amount, 0);
  const dna = computeMetaDNA({ results: sortedResults, lineups: new Map(lineups.map((l) => [l.id, l])), crowdByRace, narratives });
  const raceById = new Map(races.map((r) => [r.id, r]));
  return {
    profile,
    xp,
    level: levelForXp(xp),
    stats: computePlayerStats(sortedResults, order),
    dna,
    badges,
    results: sortedResults
      .map((r) => ({ ...r, race: raceById.get(r.raceId)!, lineup: lineups.find((l) => l.id === r.lineupId) ?? null }))
      .filter((r) => r.race)
      .reverse(),
    lineups,
    narratives,
    bestNarrative: narratives.find((n) => n.id === dna.bestNarrativeId) ?? null,
    favoriteNarrative: narratives.find((n) => n.id === dna.favoriteNarrativeId) ?? null,
    races,
  };
}

export interface NarrativeHistoryRow {
  race: Race;
  startRank: number | null;
  finishRank: number | null;
  finalScore: number | null;
}

export async function getNarrativeHistory(session: Session, narrativeId: string): Promise<NarrativeHistoryRow[]> {
  const races = (await session.store.listRaces()).filter((r) => r.status === "settled" || r.status === "live");
  const rows: NarrativeHistoryRow[] = [];
  for (const race of races) {
    const snaps = await session.store.listSnapshots(race.id);
    const start = snapshotOfKind(snaps, "prelock").find((s) => s.narrativeId === narrativeId);
    const finalSet = race.status === "settled" ? snapshotOfKind(snaps, "final") : latestRaceSnapshot(snaps);
    const fin = finalSet.find((s) => s.narrativeId === narrativeId);
    rows.push({ race, startRank: start?.rank ?? null, finishRank: fin?.rank ?? null, finalScore: fin?.score ?? null });
  }
  return rows;
}

export interface AiVsCrowdRow {
  key: string;
  label: string;
  kind: "ai" | "crowd" | "human";
  accent: string;
  races: number;
  averageScore: number;
  leaderAccuracy: number;
  wins: number;
  href: string | null;
}

export async function getAiVsCrowd(session: Session, windowDays: number): Promise<{ rows: AiVsCrowdRow[]; races: Race[]; series: { race: Race; ai: Record<string, number>; crowd: number; humans: number }[] }> {
  const { store } = session;
  const cutoff = Date.now() - windowDays * 86_400_000;
  const races = (await store.listRaces())
    .filter((r) => r.status === "settled" && Date.parse(r.endsAt) >= cutoff)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const aiProfiles = await store.listAiProfiles();
  const profiles = await store.listProfiles();
  const acc = new Map<string, AiVsCrowdRow>();
  const ensure = (key: string, label: string, kind: AiVsCrowdRow["kind"], accent: string, href: string | null) => {
    const row = acc.get(key) ?? { key, label, kind, accent, races: 0, averageScore: 0, leaderAccuracy: 0, wins: 0, href };
    acc.set(key, row);
    return row;
  };
  const series: { race: Race; ai: Record<string, number>; crowd: number; humans: number }[] = [];
  for (const race of races) {
    const results = await store.listResults(race.id);
    const lineups = await store.listLineups(race.id);
    const humanResults = results.filter((r) => r.userId);
    const aiResults = results.filter((r) => r.aiProfileId);
    const bestAi = Math.max(0, ...aiResults.map((r) => r.raceScore));
    const point = { race, ai: {} as Record<string, number>, crowd: 0, humans: 0 };
    for (const r of aiResults) {
      const p = aiProfiles.find((x) => x.id === r.aiProfileId)!;
      const row = ensure(p.id, p.name, "ai", p.accentColor, null);
      row.races++;
      row.averageScore += r.raceScore;
      row.leaderAccuracy += r.leaderHit ? 1 : 0;
      point.ai[p.code] = r.raceScore;
    }
    // Crowd consensus lineup scored as if it were a player.
    const crowd = aggregateCrowd(lineups.filter((l) => l.kind === "human"));
    if (crowd.consensus) {
      const snaps = await store.listSnapshots(race.id);
      const standings = finalStandings(snapshotOfKind(snaps, "prelock"), snapshotOfKind(snaps, "final"));
      const { scoreLineup } = await import("@/lib/scoring/race-score");
      const b = scoreLineup(crowd.consensus, standings);
      const row = ensure("crowd", "Crowd consensus", "crowd", "#B6F36B", null);
      row.races++;
      row.averageScore += b.raceScore;
      row.leaderAccuracy += b.leaderHit ? 1 : 0;
      if (b.raceScore > bestAi) row.wins++;
      point.crowd = b.raceScore;
    }
    if (humanResults.length) {
      point.humans = humanResults.reduce((s, r) => s + r.raceScore, 0) / humanResults.length;
    }
    for (const r of humanResults) {
      const p = profiles.find((x) => x.id === r.userId);
      if (!p) continue;
      const row = ensure(p.id, p.displayName, "human", "#E2E8F0", `/profile/${p.username}`);
      row.races++;
      row.averageScore += r.raceScore;
      row.leaderAccuracy += r.leaderHit ? 1 : 0;
      if (r.raceScore > bestAi) row.wins++;
    }
    series.push(point);
  }
  const rows = [...acc.values()].map((r) => ({
    ...r,
    averageScore: r.races ? Math.round((r.averageScore / r.races) * 10) / 10 : 0,
    leaderAccuracy: r.races ? r.leaderAccuracy / r.races : 0,
  }));
  const ai = rows.filter((r) => r.kind === "ai").sort((a, b) => b.averageScore - a.averageScore);
  const crowd = rows.filter((r) => r.kind === "crowd");
  const humans = rows
    .filter((r) => r.kind === "human" && r.races >= Math.min(2, races.length))
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);
  return { rows: [...ai, ...crowd, ...humans], races, series };
}

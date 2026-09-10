import { ASSETS, SIGNALS } from "../../domain/catalogue";
import { AI_PROFILES } from "../../domain/catalogue";
import { pick, seededRandom } from "../../domain/random";
import { resolveOutcome } from "../../domain/settlement";
import type { Direction, Profile, Viewer } from "../../domain/types";
import { MockMarketDataProvider, simulatedPrice } from "../../market/mock-provider";
import { ensureBattleOpened } from "../../services/lifecycle";
import { lockPrediction } from "../../services/predictions";
import { settleBattle } from "../../services/settlement";
import { DemoRepository } from "./repository";
import { emptyState, type DemoState } from "./store";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const DEMO_ANALYST_USERNAME = "nova";
export const DEMO_ADMIN_USERNAME = "arena_admin";

interface SeedUser {
  username: string;
  displayName: string;
  bio: string;
  skill: number;
  prefers: string[];
  participation: number;
  isAdmin?: boolean;
  /** Only participates in the most recent N Battles (new account). */
  recentOnly?: number;
  joinedDaysAgo: number;
}

const SEED_USERS: SeedUser[] = [
  { username: "nova", displayName: "Nova Reyes", bio: "Macro first, momentum second. Forecasting since the 2024 halving.", skill: 0.76, prefers: ["market-trend", "momentum", "volume"], participation: 0.85, joinedDaysAgo: 41 },
  { username: "kestrel_q", displayName: "Kestrel Quinn", bio: "Volatility is information.", skill: 0.62, prefers: ["volatility", "momentum", "fear-greed"], participation: 0.9, joinedDaysAgo: 38 },
  { username: "ledgerline", displayName: "Mara Osei", bio: "Breadth and dominance watcher.", skill: 0.58, prefers: ["market-breadth", "bitcoin-dominance", "volume"], participation: 0.8, joinedDaysAgo: 36 },
  { username: "tidewatch", displayName: "Theo Lindqvist", bio: "I read the timeline so you don't have to.", skill: 0.55, prefers: ["social-sentiment", "fear-greed", "momentum"], participation: 0.75, joinedDaysAgo: 35 },
  { username: "delta_frame", displayName: "Priya Natarajan", bio: "Structure over noise.", skill: 0.65, prefers: ["market-trend", "volatility", "market-breadth"], participation: 0.95, joinedDaysAgo: 40 },
  { username: "hollow_signal", displayName: "Jonah Pike", bio: "Mostly wrong, occasionally early.", skill: 0.42, prefers: ["social-sentiment", "momentum", "volume"], participation: 0.7, joinedDaysAgo: 30 },
  { username: "saltmarsh", displayName: "Iris Kowalczyk", bio: "Fear & Greed contrarian.", skill: 0.6, prefers: ["fear-greed", "bitcoin-dominance", "market-trend"], participation: 0.65, joinedDaysAgo: 33 },
  { username: "quietbid", displayName: "Sam Okafor", bio: "Volume tells the truth.", skill: 0.52, prefers: ["volume", "momentum", "volatility"], participation: 0.8, joinedDaysAgo: 29 },
  { username: "northlatch", displayName: "Elin Bergström", bio: "Trend follower, weekend skeptic.", skill: 0.66, prefers: ["market-trend", "momentum", "market-breadth"], participation: 0.6, joinedDaysAgo: 27 },
  { username: "ferrous", displayName: "Diego Alvarez", bio: "Momentum and mood.", skill: 0.48, prefers: ["momentum", "social-sentiment", "volatility"], participation: 0.85, joinedDaysAgo: 31 },
  { username: "vantablack", displayName: "Yuki Tanaka", bio: "Dominance rotations only.", skill: 0.57, prefers: ["bitcoin-dominance", "market-breadth", "volume"], participation: 0.5, joinedDaysAgo: 24 },
  { username: "amberloop", displayName: "Zoe Marchetti", bio: "Sentiment cycles, patiently.", skill: 0.61, prefers: ["fear-greed", "social-sentiment", "market-trend"], participation: 0.7, joinedDaysAgo: 26 },
  { username: "cinder_tape", displayName: "Malik Haddad", bio: "Occasional forecaster.", skill: 0.5, prefers: ["momentum", "volume", "fear-greed"], participation: 0.3, joinedDaysAgo: 20 },
  { username: "arena_admin", displayName: "Callscore Admin", bio: "Operates Callscore. Forecasts under the same rules as everyone else.", skill: 0.55, prefers: ["market-trend", "volume", "volatility"], participation: 0.3, isAdmin: true, joinedDaysAgo: 45 },
  { username: "glasswing", displayName: "Ada Mensah", bio: "New here. Building a track record.", skill: 0.6, prefers: ["momentum", "market-trend", "social-sentiment"], participation: 1, recentOnly: 3, joinedDaysAgo: 4 },
];

const THESES: Record<Direction, string[]> = {
  bullish: [
    "Higher lows holding on the daily and volume expanding on green candles. Expecting continuation above the band.",
    "Momentum has flipped positive and breadth is confirming across majors. Leaning bullish for the session.",
    "Fear & Greed reset from greed to neutral without price breaking down. That is usually absorbed dip, not distribution.",
    "Dominance rotation favours this asset today. Trend intact, volatility contracting into the move.",
  ],
  neutral: [
    "Range-bound between clear levels with volume drying up. Expecting a quiet session inside the neutral band.",
    "Momentum fading but no distribution yet. Chop is the base case.",
    "Sentiment split down the middle and breadth flat. No edge, so Neutral.",
  ],
  bearish: [
    "Lower highs on declining volume, social sentiment still euphoric. That divergence usually resolves down.",
    "Volatility expanding on red candles and breadth deteriorating. Expecting the neutral band to break lower.",
    "Trend has rolled over on the 3-day and dominance is rising. Risk-off lean.",
    "Greed reading is stretched while momentum stalls. Fade the crowd.",
  ],
};

export function demoUserId(username: string): string {
  return `demo-user-${username}`;
}

function makeProfile(u: SeedUser, anchorMs: number): Profile {
  const joined = new Date(anchorMs - u.joinedDaysAgo * DAY).toISOString();
  return {
    id: demoUserId(u.username),
    username: u.username,
    displayName: u.displayName,
    avatarUrl: null,
    bio: u.bio,
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    isAdmin: Boolean(u.isAdmin),
    createdAt: joined,
    updatedAt: joined,
  };
}

function viewerFor(p: Profile): Viewer {
  return { id: p.id, username: p.username, displayName: p.displayName, email: null, isAdmin: p.isAdmin, isGuest: false };
}

function chooseDirection(rng: () => number, outcome: Direction | null, skill: number): Direction {
  if (outcome && rng() < skill) return outcome;
  const others: Direction[] = outcome ? (["bullish", "neutral", "bearish"] as Direction[]).filter((d) => d !== outcome) : ["bullish", "neutral", "bearish"];
  // Neutral is chosen less often by humans.
  const weighted = others.flatMap((d) => (d === "neutral" ? [d] : [d, d]));
  return pick(rng, weighted);
}

function chooseSignals(rng: () => number, prefers: string[]): string[] {
  const preferredIds = prefers.map((slug) => SIGNALS.find((s) => s.slug === slug)!.id);
  const chosen = new Set<string>();
  for (const id of preferredIds) if (rng() < 0.75) chosen.add(id);
  const pool = SIGNALS.map((s) => s.id).filter((id) => !chosen.has(id));
  while (chosen.size < 3) {
    const id = pick(rng, pool);
    chosen.add(id);
  }
  return [...chosen].slice(0, 3);
}

/**
 * Build the deterministic Demo Mode dataset. Everything flows through the same
 * services production uses (lifecycle → lock → settlement), so results, XP,
 * streaks and badges are derived rather than hard-coded.
 */
export async function buildDemoState(now: Date = new Date()): Promise<DemoState> {
  const anchorMs = Math.floor(now.getTime() / HOUR) * HOUR;
  const state = emptyState(new Date(anchorMs).toISOString());
  const repo = new DemoRepository(state);
  let clock = new Date(anchorMs - 40 * DAY);
  const provider = new MockMarketDataProvider(() => clock);

  for (const u of SEED_USERS) repo.ensureProfile(makeProfile(u, anchorMs));
  const profiles = await repo.listProfiles();

  const SETTLED_DAYS = 23;
  const UPCOMING = 2;
  const battleIds: Array<{ id: string; k: number }> = [];

  for (let k = SETTLED_DAYS; k >= -UPCOMING; k--) {
    const asset = ASSETS[((k % 3) + 3) % 3];
    const opensMs = anchorMs - 2 * HOUR - k * DAY;
    const opensAt = new Date(opensMs).toISOString();
    const locksAt = new Date(opensMs + 12 * HOUR).toISOString();
    const endsAt = new Date(opensMs + 24 * HOUR).toISOString();
    const battle = await repo.createBattle({
      assetId: asset.id,
      title: `${asset.symbol} Daily Round`,
      slug: `demo-${asset.symbol.toLowerCase()}-${String(SETTLED_DAYS - k + 1).padStart(3, "0")}`,
      battleType: "daily",
      status: "upcoming",
      opensAt,
      locksAt,
      endsAt,
      neutralThresholdPercent: 0.5,
      startPrice: null,
      startPriceAt: null,
      endPrice: null,
      endPriceAt: null,
      outcome: null,
      settlementSource: null,
      settlementError: null,
      aiProfileIds: AI_PROFILES.map((p) => p.id),
      createdBy: demoUserId(DEMO_ADMIN_USERNAME),
    });
    battleIds.push({ id: battle.id, k });
  }

  // Walk time forward: open each Battle, lock human predictions, settle.
  const ordered = [...battleIds].sort((a, b) => b.k - a.k);
  for (const { id, k } of ordered) {
    let battle = (await repo.getBattle(id))!;
    const asset = ASSETS.find((a) => a.id === battle.assetId)!;
    const opensMs = Date.parse(battle.opensAt);
    if (k < 0) continue; // upcoming: stays upcoming until it opens

    clock = new Date(opensMs + 60_000);
    battle = await ensureBattleOpened(repo, provider, battle, asset, clock);

    // Outcome is only used to shape realistic seed accuracy; the real result is derived by settlement.
    const isSettledSeed = k > 0;
    const seedOutcome = isSettledSeed
      ? resolveOutcome(simulatedPrice(asset.symbol, opensMs), simulatedPrice(asset.symbol, opensMs + 24 * HOUR), battle.neutralThresholdPercent).outcome
      : null;

    for (const u of SEED_USERS) {
      const rng = seededRandom(`${u.username}:${battle.slug}`);
      if (u.recentOnly !== undefined && k > u.recentOnly) continue;
      if (k === 0 && (u.username === DEMO_ANALYST_USERNAME || u.username === DEMO_ADMIN_USERNAME)) continue;
      if (k === 0 && u.recentOnly !== undefined) continue;
      if (rng() > u.participation) continue;
      // Open Battle: only the earlier part of the window has elapsed.
      const maxOffset = k === 0 ? Math.max(0.25, (anchorMs - opensMs) / HOUR - 0.25) : 11.5;
      const offsetHours = 0.2 + rng() * maxOffset;
      const lockedAt = new Date(opensMs + offsetHours * HOUR);
      if (lockedAt.getTime() >= Date.parse(battle.locksAt) || (k === 0 && lockedAt.getTime() > now.getTime())) continue;
      const direction = chooseDirection(rng, seedOutcome, u.skill);
      const signalIds = chooseSignals(rng, u.prefers);
      const confidence = Math.min(5, Math.max(1, Math.round(2 + rng() * 3 + (rng() < 0.2 ? 1 : 0))));
      const thesis = rng() < 0.55 ? pick(rng, THESES[direction]) : "";
      clock = lockedAt;
      const profile = profiles.find((p) => p.username === u.username)!;
      await lockPrediction(repo, provider, viewerFor(profile), { battleId: battle.id, direction, signalIds, confidence, thesis }, lockedAt);
    }

    if (isSettledSeed) {
      clock = new Date(Date.parse(battle.endsAt) + 5 * 60_000);
      const result = await settleBattle(repo, provider, battle.id, { source: "seed", actorId: null, now: clock });
      if (result.status !== "settled") throw new Error(`Demo seed failed to settle ${battle.slug}: ${result.message}`);
    }
  }

  // Demonstrate a void Battle: an extra ETH Battle four days ago voided for a data outage.
  const voidOpens = anchorMs - 2 * HOUR - 4 * DAY + 6 * HOUR;
  const voidBattle = await repo.createBattle({
    assetId: ASSETS[1].id,
    title: "ETH Flash Round",
    slug: "demo-eth-void",
    battleType: "daily",
    status: "void",
    opensAt: new Date(voidOpens).toISOString(),
    locksAt: new Date(voidOpens + 6 * HOUR).toISOString(),
    endsAt: new Date(voidOpens + 12 * HOUR).toISOString(),
    neutralThresholdPercent: 0.35,
    startPrice: simulatedPrice("ETH", voidOpens),
    startPriceAt: new Date(voidOpens).toISOString(),
    endPrice: null,
    endPriceAt: null,
    outcome: null,
    settlementSource: null,
    settlementError: "Voided by admin: end-price snapshot unavailable from provider after retries.",
    aiProfileIds: AI_PROFILES.map((p) => p.id),
    createdBy: demoUserId(DEMO_ADMIN_USERNAME),
  });
  await repo.appendAudit({ actorId: demoUserId(DEMO_ADMIN_USERNAME), action: "battle.void", targetType: "round", targetId: voidBattle.id, details: { reason: "End-price snapshot unavailable" } });

  clock = now;
  state.builtAt = new Date().toISOString();
  return state;
}

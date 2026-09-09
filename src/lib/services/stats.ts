import { MIN_RANKED_BATTLES } from "../config";
import { aggregateCrowd } from "../domain/crowd";
import { computeSignalDNA, type SignalDNA } from "../domain/dna";
import { arenaRating, computeAccuracy, levelProgress, type AccuracyStats } from "../domain/scoring";
import type { AIPrediction, AIProfile, Asset, Badge, Battle, Direction, Prediction, Profile, Signal, UserBadge } from "../domain/types";
import type { ArenaRepository } from "../data/repository";

export interface ProfileStats {
  profile: Profile;
  accuracy: AccuracyStats;
  rating: number;
  ranked: boolean;
  level: ReturnType<typeof levelProgress>;
  bestSignal: { name: string; accuracy: number | null } | null;
  bestAsset: { symbol: string; accuracy: number | null } | null;
  predictions: Prediction[];
  badges: Array<Badge & { awardedAt: string }>;
  dna: SignalDNA;
}

export interface LeaderboardRow {
  rank: number | null;
  profile: Profile;
  level: ReturnType<typeof levelProgress>["level"];
  accuracy: number | null;
  settled: number;
  streak: number;
  bestSignal: string | null;
  rating: number;
  ranked: boolean;
}

export type LeaderboardRange = "week" | "month" | "all";

export interface ArenaContext {
  assets: Asset[];
  signals: Signal[];
  aiProfiles: AIProfile[];
  badges: Badge[];
  battles: Battle[];
  predictions: Prediction[];
  aiPredictions: AIPrediction[];
  profiles: Profile[];
  userBadges: UserBadge[];
}

/** Load the full public dataset once for aggregate pages. */
export async function loadArenaContext(repo: ArenaRepository): Promise<ArenaContext> {
  const [assets, signals, aiProfiles, badges, battles, predictions, aiPredictions, profiles, userBadges] = await Promise.all([
    repo.listAssets(),
    repo.listSignals(),
    repo.listAIProfiles(),
    repo.listBadges(),
    repo.listBattles(),
    repo.listPredictions(),
    repo.listAIPredictions(),
    repo.listProfiles(),
    repo.listUserBadges(),
  ]);
  return { assets, signals, aiProfiles, badges, battles, predictions, aiPredictions, profiles, userBadges };
}

export function crowdMajorityByBattle(predictions: Prediction[]): Record<string, Direction | null> {
  const byBattle = new Map<string, Prediction[]>();
  for (const p of predictions) {
    const arr = byBattle.get(p.battleId) ?? [];
    arr.push(p);
    byBattle.set(p.battleId, arr);
  }
  const out: Record<string, Direction | null> = {};
  for (const [id, preds] of byBattle) out[id] = aggregateCrowd(preds).majority;
  return out;
}

export function buildProfileStats(ctx: ArenaContext, profile: Profile): ProfileStats {
  const predictions = ctx.predictions.filter((p) => p.userId === profile.id);
  const battleById = new Map(ctx.battles.map((b) => [b.id, b]));
  const sorted = [...predictions].sort((a, b) => Date.parse(battleById.get(b.battleId)?.endsAt ?? b.lockedAt) - Date.parse(battleById.get(a.battleId)?.endsAt ?? a.lockedAt));
  const accuracy = computeAccuracy(predictions);
  const rating = arenaRating(accuracy.accuracy, accuracy.valid, profile.currentStreak);
  const dna = computeSignalDNA({ predictions, battles: ctx.battles, assets: ctx.assets, signals: ctx.signals, crowdMajority: crowdMajorityByBattle(ctx.predictions) });
  const badges = ctx.userBadges
    .filter((ub) => ub.userId === profile.id)
    .map((ub) => {
      const b = ctx.badges.find((x) => x.id === ub.badgeId);
      return b ? { ...b, awardedAt: ub.awardedAt } : null;
    })
    .filter((b): b is Badge & { awardedAt: string } => b !== null)
    .sort((a, b) => Date.parse(a.awardedAt) - Date.parse(b.awardedAt));
  return {
    profile,
    accuracy,
    rating,
    ranked: accuracy.valid >= MIN_RANKED_BATTLES,
    level: levelProgress(profile.xp),
    bestSignal: dna.bestSignal ? { name: dna.bestSignal.name, accuracy: dna.bestSignal.accuracy } : null,
    bestAsset: dna.bestAsset ? { symbol: dna.bestAsset.symbol, accuracy: dna.bestAsset.accuracy } : null,
    predictions: sorted,
    badges,
    dna,
  };
}

export function buildLeaderboard(ctx: ArenaContext, opts: { range: LeaderboardRange; asset?: string | null; now?: Date }): LeaderboardRow[] {
  const now = opts.now ?? new Date();
  const cutoff = opts.range === "week" ? now.getTime() - 7 * 86_400_000 : opts.range === "month" ? now.getTime() - 30 * 86_400_000 : null;
  const battleById = new Map(ctx.battles.map((b) => [b.id, b]));
  const assetId = opts.asset ? ctx.assets.find((a) => a.symbol === opts.asset)?.id ?? null : null;

  const inScope = (p: Prediction) => {
    const b = battleById.get(p.battleId);
    if (!b) return false;
    if (assetId && b.assetId !== assetId) return false;
    if (cutoff !== null && Date.parse(b.endsAt) < cutoff) return false;
    return true;
  };

  const rows: LeaderboardRow[] = ctx.profiles.map((profile) => {
    const preds = ctx.predictions.filter((p) => p.userId === profile.id && inScope(p));
    const acc = computeAccuracy(preds);
    // Streak within scope: consecutive correct from the most recent settled.
    const ordered = preds
      .filter((p) => p.result === "correct" || p.result === "incorrect")
      .sort((a, b) => Date.parse(battleById.get(b.battleId)!.endsAt) - Date.parse(battleById.get(a.battleId)!.endsAt));
    let streak = 0;
    for (const p of ordered) {
      if (p.result === "correct") streak++;
      else break;
    }
    const dna = computeSignalDNA({ predictions: preds, battles: ctx.battles, assets: ctx.assets, signals: ctx.signals });
    const ranked = acc.valid >= MIN_RANKED_BATTLES;
    return {
      rank: null,
      profile,
      level: levelProgress(profile.xp).level,
      accuracy: acc.accuracy,
      settled: acc.valid,
      streak,
      bestSignal: dna.bestSignal?.name ?? dna.mostUsedSignal?.name ?? null,
      rating: arenaRating(acc.accuracy, acc.valid, streak),
      ranked,
    };
  });

  const ranked = rows.filter((r) => r.ranked).sort((a, b) => b.rating - a.rating || (b.accuracy ?? 0) - (a.accuracy ?? 0) || b.settled - a.settled);
  ranked.forEach((r, i) => (r.rank = i + 1));
  const unranked = rows.filter((r) => !r.ranked && r.settled > 0).sort((a, b) => b.rating - a.rating);
  return [...ranked, ...unranked];
}

export interface HumansVsAiSummary {
  humanAccuracy: AccuracyStats;
  aiAccuracy: AccuracyStats;
  human7d: AccuracyStats;
  ai7d: AccuracyStats;
  human30d: AccuracyStats;
  ai30d: AccuracyStats;
  /** Battles won by humans (crowd majority correct) vs AI (majority of AI correct). */
  battleWins: { humans: number; ai: number; ties: number };
  trend: Array<{ date: string; label: string; human: number | null; ai: number | null }>;
  aiProfileStats: Array<{ profile: AIProfile; accuracy: AccuracyStats; streak: number; rating: number; recent: AIPrediction[] }>;
  recentBattles: Array<{ battle: Battle; asset: Asset | undefined; winner: "humans" | "ai" | "tie" | "void"; humanCorrectShare: number | null; aiCorrectShare: number | null; change: number | null }>;
  biggestDisagreement: { battle: Battle; asset: Asset | undefined; crowd: Direction; ai: Direction; crowdShare: number; outcome: Direction | null } | null;
  bestSignal: { name: string; accuracy: number; uses: number } | null;
}

export function buildHumansVsAi(ctx: ArenaContext, now: Date = new Date()): HumansVsAiSummary {
  const battleById = new Map(ctx.battles.map((b) => [b.id, b]));
  const assetById = new Map(ctx.assets.map((a) => [a.id, a]));
  const settledBattles = ctx.battles.filter((b) => b.status === "settled").sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt));

  const within = (days: number) => (p: { battleId: string }) => {
    const b = battleById.get(p.battleId);
    return b ? Date.parse(b.endsAt) >= now.getTime() - days * 86_400_000 : false;
  };

  const humanAccuracy = computeAccuracy(ctx.predictions);
  const aiAccuracy = computeAccuracy(ctx.aiPredictions);
  const human7d = computeAccuracy(ctx.predictions.filter(within(7)));
  const ai7d = computeAccuracy(ctx.aiPredictions.filter(within(7)));
  const human30d = computeAccuracy(ctx.predictions.filter(within(30)));
  const ai30d = computeAccuracy(ctx.aiPredictions.filter(within(30)));

  const battleWins = { humans: 0, ai: 0, ties: 0 };
  const recentBattles: HumansVsAiSummary["recentBattles"] = [];
  const trend: HumansVsAiSummary["trend"] = [];
  let biggest: HumansVsAiSummary["biggestDisagreement"] = null;
  let biggestGap = 0;

  for (const b of settledBattles) {
    const hp = ctx.predictions.filter((p) => p.battleId === b.id && (p.result === "correct" || p.result === "incorrect"));
    const ap = ctx.aiPredictions.filter((p) => p.battleId === b.id && (p.result === "correct" || p.result === "incorrect"));
    const hShare = hp.length ? hp.filter((p) => p.result === "correct").length / hp.length : null;
    const aShare = ap.length ? ap.filter((p) => p.result === "correct").length / ap.length : null;
    let winner: "humans" | "ai" | "tie" | "void" = "tie";
    if (hShare === null || aShare === null) winner = "void";
    else if (hShare > aShare) winner = "humans";
    else if (aShare > hShare) winner = "ai";
    if (winner === "humans") battleWins.humans++;
    else if (winner === "ai") battleWins.ai++;
    else if (winner === "tie") battleWins.ties++;
    const change = b.startPrice && b.endPrice ? ((b.endPrice - b.startPrice) / b.startPrice) * 100 : null;
    recentBattles.push({ battle: b, asset: assetById.get(b.assetId), winner, humanCorrectShare: hShare, aiCorrectShare: aShare, change });
    const d = new Date(b.endsAt);
    trend.push({ date: b.endsAt, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), human: hShare === null ? null : Math.round(hShare * 100), ai: aShare === null ? null : Math.round(aShare * 100) });

    const crowd = aggregateCrowd(ctx.predictions.filter((p) => p.battleId === b.id));
    const aiCrowd = aggregateCrowd(ctx.aiPredictions.filter((p) => p.battleId === b.id));
    if (crowd.majority && aiCrowd.majority && crowd.majority !== aiCrowd.majority) {
      const gap = crowd.percentages[crowd.majority] + aiCrowd.percentages[aiCrowd.majority];
      if (gap > biggestGap) {
        biggestGap = gap;
        biggest = { battle: b, asset: assetById.get(b.assetId), crowd: crowd.majority, ai: aiCrowd.majority, crowdShare: crowd.percentages[crowd.majority], outcome: b.outcome };
      }
    }
  }

  const aiProfileStats = ctx.aiProfiles.map((profile) => {
    const preds = ctx.aiPredictions.filter((p) => p.aiProfileId === profile.id);
    const acc = computeAccuracy(preds);
    const ordered = preds
      .filter((p) => p.result === "correct" || p.result === "incorrect")
      .sort((a, b) => Date.parse(battleById.get(b.battleId)?.endsAt ?? b.lockedAt) - Date.parse(battleById.get(a.battleId)?.endsAt ?? a.lockedAt));
    let streak = 0;
    for (const p of ordered) {
      if (p.result === "correct") streak++;
      else break;
    }
    return { profile, accuracy: acc, streak, rating: arenaRating(acc.accuracy, acc.valid, streak), recent: ordered.slice(0, 5) };
  });

  // Best-performing signal across all settled human predictions.
  const usage = new Map<string, { name: string; correct: number; valid: number }>();
  for (const p of ctx.predictions) {
    if (p.result !== "correct" && p.result !== "incorrect") continue;
    for (const sid of p.signalIds) {
      const s = ctx.signals.find((x) => x.id === sid);
      if (!s) continue;
      const u = usage.get(sid) ?? { name: s.name, correct: 0, valid: 0 };
      u.valid++;
      if (p.result === "correct") u.correct++;
      usage.set(sid, u);
    }
  }
  const bestSignalEntry = [...usage.values()].filter((u) => u.valid >= 5).sort((a, b) => b.correct / b.valid - a.correct / a.valid)[0];
  const bestSignal = bestSignalEntry ? { name: bestSignalEntry.name, accuracy: bestSignalEntry.correct / bestSignalEntry.valid, uses: bestSignalEntry.valid } : null;

  return {
    humanAccuracy,
    aiAccuracy,
    human7d,
    ai7d,
    human30d,
    ai30d,
    battleWins,
    trend: trend.slice(-21),
    aiProfileStats,
    recentBattles: recentBattles.reverse().slice(0, 10),
    biggestDisagreement: biggest,
    bestSignal,
  };
}

/** Streak immediately after a given Battle settled, from the user's chronological history. */
export function streakAfterBattle(predictions: Prediction[], battles: Battle[], battleId: string): number {
  const endsAt = new Map(battles.map((b) => [b.id, Date.parse(b.endsAt)]));
  const target = endsAt.get(battleId);
  if (target === undefined) return 0;
  const ordered = predictions
    .filter((p) => (p.result === "correct" || p.result === "incorrect") && (endsAt.get(p.battleId) ?? Infinity) <= target)
    .sort((a, b) => (endsAt.get(a.battleId) ?? 0) - (endsAt.get(b.battleId) ?? 0));
  let streak = 0;
  for (const p of ordered) streak = p.result === "correct" ? streak + 1 : 0;
  return streak;
}

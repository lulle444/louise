import { aggregateCrowd } from "../domain/crowd";
import { computeAccuracy } from "../domain/scoring";
import type { Asset, Battle, Direction, Prediction, Profile } from "../domain/types";
import { buildHumansVsAi, buildLeaderboard, type ArenaContext, type HumansVsAiSummary, type LeaderboardRow } from "./stats";

export interface ContrarianRow {
  profile: Profile;
  wins: number;
  attempts: number;
}

export interface FeaturedCard {
  prediction: Prediction;
  profile: Profile;
  battle: Battle;
  asset: Asset;
  againstCrowd: boolean;
  beatAllAI: boolean;
  crowdShare: number;
}

export interface SeasonRecap {
  weekStart: string;
  weekEnd: string;
  battlesSettled: number;
  forecastsLocked: number;
  activeAnalysts: number;
  humanAccuracy: number | null;
  aiAccuracy: number | null;
  weekWins: { humans: number; ai: number; ties: number };
  leaderboard: LeaderboardRow[];
  contrarians: ContrarianRow[];
  featured: FeaturedCard[];
  longestActiveStreak: { profile: Profile; streak: number } | null;
  crowdWrongest: { battle: Battle; asset: Asset | undefined; crowd: Direction; share: number; outcome: Direction | null } | null;
  summary: HumansVsAiSummary;
  foundingCount: number;
}

/** Aggregate the last seven days of settled Battles into a shareable recap. */
export function buildSeasonRecap(ctx: ArenaContext, now: Date = new Date()): SeasonRecap {
  const weekStartMs = now.getTime() - 7 * 86_400_000;
  const assetById = new Map(ctx.assets.map((a) => [a.id, a]));
  const profileById = new Map(ctx.profiles.map((p) => [p.id, p]));

  const weekBattles = ctx.battles.filter((b) => b.status === "settled" && Date.parse(b.endsAt) >= weekStartMs && Date.parse(b.endsAt) <= now.getTime());
  const weekIds = new Set(weekBattles.map((b) => b.id));
  const weekPreds = ctx.predictions.filter((p) => weekIds.has(p.battleId));
  const weekAI = ctx.aiPredictions.filter((p) => weekIds.has(p.battleId));

  const weekWins = { humans: 0, ai: 0, ties: 0 };
  let crowdWrongest: SeasonRecap["crowdWrongest"] = null;
  const contrarianMap = new Map<string, ContrarianRow>();
  const featured: FeaturedCard[] = [];

  for (const b of weekBattles) {
    const hp = weekPreds.filter((p) => p.battleId === b.id);
    const ap = weekAI.filter((p) => p.battleId === b.id);
    const h = computeAccuracy(hp).accuracy;
    const a = computeAccuracy(ap).accuracy;
    if (h !== null && a !== null) {
      if (h > a) weekWins.humans++;
      else if (a > h) weekWins.ai++;
      else weekWins.ties++;
    }
    const crowd = aggregateCrowd(hp);
    if (crowd.majority && b.outcome && crowd.majority !== b.outcome) {
      const share = crowd.percentages[crowd.majority];
      if (!crowdWrongest || share > crowdWrongest.share) crowdWrongest = { battle: b, asset: assetById.get(b.assetId), crowd: crowd.majority, share, outcome: b.outcome };
    }
    const allAIWrong = ap.length > 0 && ap.every((p) => p.result === "incorrect");
    for (const p of hp) {
      const profile = profileById.get(p.userId);
      if (!profile) continue;
      const against = crowd.majority !== null && crowd.majority !== p.direction;
      if (against) {
        const row = contrarianMap.get(p.userId) ?? { profile, wins: 0, attempts: 0 };
        row.attempts++;
        if (p.result === "correct") row.wins++;
        contrarianMap.set(p.userId, row);
      }
      if (p.result === "correct" && (against || allAIWrong)) {
        const asset = assetById.get(b.assetId);
        if (asset) featured.push({ prediction: p, profile, battle: b, asset, againstCrowd: against, beatAllAI: allAIWrong, crowdShare: crowd.percentages[p.direction] });
      }
    }
  }

  featured.sort((x, y) => Number(y.beatAllAI) - Number(x.beatAllAI) || x.crowdShare - y.crowdShare || (y.prediction.thesis ? 1 : 0) - (x.prediction.thesis ? 1 : 0));
  const contrarians = [...contrarianMap.values()].filter((r) => r.wins > 0).sort((x, y) => y.wins - x.wins || x.attempts - y.attempts).slice(0, 5);

  const leaderboard = buildLeaderboard(ctx, { range: "week", now }).slice(0, 10);
  const streakLeader = [...ctx.profiles].sort((x, y) => y.currentStreak - x.currentStreak)[0];
  const foundingBadge = ctx.badges.find((b) => b.slug === "founding-analyst");
  const foundingCount = foundingBadge ? ctx.userBadges.filter((ub) => ub.badgeId === foundingBadge.id).length : 0;

  return {
    weekStart: new Date(weekStartMs).toISOString(),
    weekEnd: now.toISOString(),
    battlesSettled: weekBattles.length,
    forecastsLocked: weekPreds.length,
    activeAnalysts: new Set(weekPreds.map((p) => p.userId)).size,
    humanAccuracy: computeAccuracy(weekPreds).accuracy,
    aiAccuracy: computeAccuracy(weekAI).accuracy,
    weekWins,
    leaderboard,
    contrarians,
    featured: featured.slice(0, 4),
    longestActiveStreak: streakLeader && streakLeader.currentStreak > 0 ? { profile: streakLeader, streak: streakLeader.currentStreak } : null,
    crowdWrongest,
    summary: buildHumansVsAi(ctx, now),
    foundingCount,
  };
}


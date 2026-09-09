import type { Badge, Direction, Prediction } from "./types";

export const BADGE_CATALOGUE: Badge[] = [
  { id: "badge-first-signal", slug: "first-signal", name: "First Signal", description: "Locked your first forecast.", icon: "Radio" },
  { id: "badge-three-day-streak", slug: "three-day-streak", name: "Three-Day Streak", description: "Three correct Battles in a row.", icon: "Flame" },
  { id: "badge-five-day-streak", slug: "five-day-streak", name: "Five-Day Streak", description: "Five correct Battles in a row.", icon: "Zap" },
  { id: "badge-perfect-week", slug: "perfect-week", name: "Perfect Week", description: "Seven correct Battles in a row.", icon: "Crown" },
  { id: "badge-beat-the-ai", slug: "beat-the-ai", name: "Beat the AI", description: "Correct while every AI analyst in the Battle was wrong.", icon: "Cpu" },
  { id: "badge-crowd-breaker", slug: "crowd-breaker", name: "Crowd Breaker", description: "Correct against the crowd majority.", icon: "Users" },
  { id: "badge-btc-specialist", slug: "btc-specialist", name: "BTC Specialist", description: "Five correct BTC Battles.", icon: "Bitcoin" },
  { id: "badge-eth-specialist", slug: "eth-specialist", name: "ETH Specialist", description: "Five correct ETH Battles.", icon: "Hexagon" },
  { id: "badge-sol-specialist", slug: "sol-specialist", name: "SOL Specialist", description: "Five correct SOL Battles.", icon: "Sun" },
  { id: "badge-momentum-master", slug: "momentum-master", name: "Momentum Master", description: "Five correct forecasts citing Momentum.", icon: "TrendingUp" },
  { id: "badge-contrarian-win", slug: "contrarian-win", name: "Contrarian Win", description: "Correct with a direction fewer than 25% of the crowd chose.", icon: "GitBranch" },
];

export const badgeBySlug = (slug: string): Badge | undefined => BADGE_CATALOGUE.find((b) => b.slug === slug);

export interface BadgeEvaluationContext {
  /** The prediction that has just been settled. */
  prediction: Prediction;
  assetSymbol: string;
  /** Streak after applying this result. */
  streakAfter: number;
  /** All of the user's predictions including the just-settled one, results applied. */
  history: Prediction[];
  /** Asset symbol per battle id for the history. */
  assetByBattle: Record<string, string>;
  /** Signal slug per signal id. */
  signalSlugById: Record<string, string>;
  aiResults: Array<{ result: Prediction["result"] }>;
  crowdCounts: Record<Direction, number>;
  crowdTotal: number;
  /** Badge slugs already held. */
  existing: Set<string>;
}

/** Evaluate which new badges a user earns from a settlement event. Pure. */
export function evaluateBadges(ctx: BadgeEvaluationContext): string[] {
  const earned: string[] = [];
  const add = (slug: string) => {
    if (!ctx.existing.has(slug) && !earned.includes(slug)) earned.push(slug);
  };
  const p = ctx.prediction;
  add("first-signal");

  if (p.result !== "correct") return earned;

  if (ctx.streakAfter >= 3) add("three-day-streak");
  if (ctx.streakAfter >= 5) add("five-day-streak");
  if (ctx.streakAfter >= 7) add("perfect-week");

  if (ctx.aiResults.length > 0 && ctx.aiResults.every((a) => a.result === "incorrect")) add("beat-the-ai");

  if (ctx.crowdTotal > 1) {
    const ordered = (Object.keys(ctx.crowdCounts) as Direction[]).sort((a, b) => ctx.crowdCounts[b] - ctx.crowdCounts[a]);
    const majority = ordered[0];
    if (majority !== p.direction && ctx.crowdCounts[majority] > ctx.crowdCounts[p.direction]) add("crowd-breaker");
    const share = ctx.crowdCounts[p.direction] / ctx.crowdTotal;
    if (share < 0.25) add("contrarian-win");
  }

  const correctByAsset: Record<string, number> = {};
  let momentumCorrect = 0;
  for (const h of ctx.history) {
    if (h.result !== "correct") continue;
    const sym = ctx.assetByBattle[h.battleId];
    if (sym) correctByAsset[sym] = (correctByAsset[sym] ?? 0) + 1;
    if (h.signalIds.some((id) => ctx.signalSlugById[id] === "momentum")) momentumCorrect++;
  }
  if ((correctByAsset.BTC ?? 0) >= 5) add("btc-specialist");
  if ((correctByAsset.ETH ?? 0) >= 5) add("eth-specialist");
  if ((correctByAsset.SOL ?? 0) >= 5) add("sol-specialist");
  if (momentumCorrect >= 5) add("momentum-master");

  return earned;
}

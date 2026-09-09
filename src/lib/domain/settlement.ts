import type { Battle, BattleStatus, Direction, PredictionResult } from "./types";

/**
 * Percentage change from start to end price. Uses plain JS numbers for the
 * calculation but rounds to 6 decimals to remove floating-point noise so that
 * threshold comparisons at exact boundaries behave predictably. Persisted
 * prices use NUMERIC types in Postgres.
 */
export function percentageChange(startPrice: number, endPrice: number): number {
  if (!isValidPrice(startPrice) || !isValidPrice(endPrice)) {
    throw new Error("Prices must be positive finite numbers");
  }
  const raw = ((endPrice - startPrice) / startPrice) * 100;
  return roundTo(raw, 6);
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export function isValidPrice(price: unknown): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

/**
 * Direction outcome for a settled Battle.
 * Bullish if change > threshold, Bearish if change < -threshold, otherwise Neutral.
 * A change exactly equal to ±threshold is Neutral.
 */
export function resolveOutcome(
  startPrice: number,
  endPrice: number,
  neutralThresholdPercent: number,
): { outcome: Direction; change: number } {
  if (!Number.isFinite(neutralThresholdPercent) || neutralThresholdPercent < 0) {
    throw new Error("Neutral threshold must be a non-negative number");
  }
  const change = percentageChange(startPrice, endPrice);
  const threshold = roundTo(neutralThresholdPercent, 6);
  if (change > threshold) return { outcome: "bullish", change };
  if (change < -threshold) return { outcome: "bearish", change };
  return { outcome: "neutral", change };
}

export function scorePrediction(
  direction: Direction,
  outcome: Direction | null,
  battleVoid: boolean,
): { result: PredictionResult; battleScore: number | null } {
  if (battleVoid || outcome === null) return { result: "void", battleScore: null };
  return direction === outcome
    ? { result: "correct", battleScore: 100 }
    : { result: "incorrect", battleScore: 0 };
}

/**
 * Effective (time-derived) status for a Battle. Stored status is authoritative
 * for terminal states (draft/settling/settled/void/archived); for published
 * Battles the open/locked state is derived from the clock so that deadlines
 * are enforced server-side regardless of when a cron last ran.
 */
export function effectiveStatus(
  battle: Pick<Battle, "status" | "opensAt" | "locksAt" | "endsAt">,
  now: Date = new Date(),
): BattleStatus {
  const s = battle.status;
  if (s === "draft" || s === "settling" || s === "settled" || s === "void" || s === "archived") {
    return s;
  }
  const t = now.getTime();
  if (t < Date.parse(battle.opensAt)) return "upcoming";
  if (t < Date.parse(battle.locksAt)) return "open";
  return "locked";
}

export function isAcceptingPredictions(
  battle: Pick<Battle, "status" | "opensAt" | "locksAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  return effectiveStatus(battle, now) === "open";
}

export function canSettle(
  battle: Pick<Battle, "status" | "opensAt" | "locksAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  const s = effectiveStatus(battle, now);
  return s === "locked" && now.getTime() >= Date.parse(battle.endsAt);
}

export function formatNeutralBand(thresholdPercent: number): string {
  const t = thresholdPercent.toFixed(2).replace(/\.?0+$/, "");
  return `−${t}% to +${t}%`;
}

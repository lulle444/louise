import type { Prediction, PredictionResult, XpReason } from "./types";

export const XP_RULES: Record<XpReason, number> = {
  lock: 10,
  correct: 100,
  streak_3: 25,
  streak_5: 50,
  seven_battles: 50,
};

export interface Level {
  level: number;
  name: string;
  minXp: number;
}

export const LEVELS: Level[] = [
  { level: 1, name: "Observer", minXp: 0 },
  { level: 2, name: "Scout", minXp: 250 },
  { level: 3, name: "Analyst", minXp: 750 },
  { level: 4, name: "Strategist", minXp: 1500 },
  { level: 5, name: "Signal Hunter", minXp: 3000 },
  { level: 6, name: "Oracle", minXp: 6000 },
];

export function levelForXp(xp: number): Level {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  return current;
}

export function levelProgress(xp: number): {
  level: Level;
  next: Level | null;
  progress: number; // 0..1
  xpIntoLevel: number;
  xpForLevel: number;
} {
  const level = levelForXp(xp);
  const next = LEVELS.find((l) => l.level === level.level + 1) ?? null;
  if (!next) return { level, next, progress: 1, xpIntoLevel: xp - level.minXp, xpForLevel: 0 };
  const span = next.minXp - level.minXp;
  const into = xp - level.minXp;
  return { level, next, progress: Math.min(1, Math.max(0, into / span)), xpIntoLevel: into, xpForLevel: span };
}

export interface AccuracyStats {
  correct: number;
  incorrect: number;
  valid: number;
  voided: number;
  pending: number;
  /** 0..1, or null when there are no valid settled predictions. */
  accuracy: number | null;
}

export function computeAccuracy(
  results: Array<{ result: PredictionResult }>,
): AccuracyStats {
  let correct = 0;
  let incorrect = 0;
  let voided = 0;
  let pending = 0;
  for (const r of results) {
    if (r.result === "correct") correct++;
    else if (r.result === "incorrect") incorrect++;
    else if (r.result === "void") voided++;
    else pending++;
  }
  const valid = correct + incorrect;
  return { correct, incorrect, valid, voided, pending, accuracy: valid > 0 ? correct / valid : null };
}

/**
 * Callscore rating (0..100). Transparent formula that reduces the advantage of
 * tiny sample sizes:
 *   accuracy_component   = accuracy% * 0.60
 *   experience_component = min(valid / 30, 1) * 25
 *   consistency_component= min(streak / 10, 1) * 15
 */
export function arenaRating(
  accuracy: number | null,
  validSettled: number,
  currentStreak: number,
): number {
  const accuracyPercentage = (accuracy ?? 0) * 100;
  const accuracyComponent = accuracyPercentage * 0.6;
  const experienceComponent = Math.min(validSettled / 30, 1) * 25;
  const consistencyComponent = Math.min(currentStreak / 10, 1) * 15;
  return Math.round((accuracyComponent + experienceComponent + consistencyComponent) * 10) / 10;
}

/**
 * Compute streaks from a chronologically ordered list of results.
 * Void and pending results do not affect the streak.
 */
export function computeStreaks(orderedResults: PredictionResult[]): {
  current: number;
  longest: number;
} {
  let current = 0;
  let longest = 0;
  for (const r of orderedResults) {
    if (r === "correct") {
      current++;
      if (current > longest) longest = current;
    } else if (r === "incorrect") {
      current = 0;
    }
  }
  return { current, longest };
}

export interface XpAward {
  reason: XpReason;
  amount: number;
}

/**
 * XP awards for a single settled prediction, given the streak state *after*
 * this result is applied and the number of valid settled Battles including it.
 * Lock XP is awarded at lock time, not here.
 */
export function settlementXpAwards(input: {
  result: PredictionResult;
  streakAfter: number;
  validSettledAfter: number;
  hasSevenBattleBonus: boolean;
}): XpAward[] {
  const awards: XpAward[] = [];
  if (input.result === "correct") {
    awards.push({ reason: "correct", amount: XP_RULES.correct });
    if (input.streakAfter === 3) awards.push({ reason: "streak_3", amount: XP_RULES.streak_3 });
    if (input.streakAfter === 5) awards.push({ reason: "streak_5", amount: XP_RULES.streak_5 });
  }
  if (
    input.result !== "void" &&
    input.validSettledAfter === 7 &&
    !input.hasSevenBattleBonus
  ) {
    awards.push({ reason: "seven_battles", amount: XP_RULES.seven_battles });
  }
  return awards;
}

/**
 * Idempotency key for an XP ledger entry. The ledger enforces uniqueness on
 * (user_id, battle_id, reason) so re-running settlement never double-awards.
 */
export function xpLedgerKey(userId: string, battleId: string | null, reason: XpReason): string {
  return `${userId}:${battleId ?? "-"}:${reason}`;
}

export function sortByLockedAt<T extends Pick<Prediction, "lockedAt">>(items: T[]): T[] {
  return [...items].sort((a, b) => Date.parse(a.lockedAt) - Date.parse(b.lockedAt));
}

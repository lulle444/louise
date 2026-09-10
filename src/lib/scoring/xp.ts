import type { XpEntry, XpReason } from "@/lib/types";
import type { RaceScoreBreakdown } from "./race-score";

export const XP_RULES: Record<XpReason, { amount: number; label: string }> = {
  lineup_locked: { amount: 10, label: "Locked a valid lineup" },
  leader_correct: { amount: 100, label: "Correct winning Leader" },
  challenger_podium: { amount: 40, label: "Challenger finished top 3" },
  wildcard_success: { amount: 60, label: "Successful Wildcard" },
  participation_streak: { amount: 25, label: "Three-Race participation streak" },
  leader_streak: { amount: 50, label: "Three correct Leaders in a row" },
};

export interface XpAward {
  reason: XpReason;
  amount: number;
  idempotencyKey: string;
}

export interface StreakContext {
  /** Number of consecutive prior Races (immediately before this one) with a valid locked lineup. */
  priorParticipationStreak: number;
  /** Number of consecutive prior Races with a correct Leader. */
  priorLeaderStreak: number;
}

/**
 * Compute the XP awards for one settled lineup. Keys are deterministic per
 * (user, race, reason) so a ledger can reject duplicates on re-settlement.
 */
export function xpForSettlement(
  userId: string,
  raceId: string,
  breakdown: RaceScoreBreakdown,
  streaks: StreakContext,
): XpAward[] {
  const awards: XpAward[] = [];
  const add = (reason: XpReason) =>
    awards.push({ reason, amount: XP_RULES[reason].amount, idempotencyKey: `${userId}:${raceId}:${reason}` });

  if (breakdown.leaderHit) add("leader_correct");
  if (breakdown.challengerHit) add("challenger_podium");
  if (breakdown.wildcardHit) add("wildcard_success");

  // Streaks count this race. +2 prior + this one = 3.
  const participation = streaks.priorParticipationStreak + 1;
  if (participation > 0 && participation % 3 === 0) add("participation_streak");

  const leaderStreak = breakdown.leaderHit ? streaks.priorLeaderStreak + 1 : 0;
  if (leaderStreak > 0 && leaderStreak % 3 === 0) add("leader_streak");

  return awards;
}

export function lockXp(userId: string, raceId: string): XpAward {
  return {
    reason: "lineup_locked",
    amount: XP_RULES.lineup_locked.amount,
    idempotencyKey: `${userId}:${raceId}:lineup_locked`,
  };
}

/**
 * Apply awards to a ledger, skipping any whose idempotency key already exists.
 * Returns the entries that were actually added.
 */
export function applyAwards(
  ledger: XpEntry[],
  userId: string,
  raceId: string | null,
  awards: XpAward[],
  now: string,
  makeId: () => string,
): XpEntry[] {
  const existing = new Set(ledger.map((e) => e.idempotencyKey));
  const added: XpEntry[] = [];
  for (const a of awards) {
    if (existing.has(a.idempotencyKey)) continue;
    const entry: XpEntry = {
      id: makeId(),
      userId,
      raceId,
      reason: a.reason,
      amount: a.amount,
      createdAt: now,
      idempotencyKey: a.idempotencyKey,
    };
    ledger.push(entry);
    existing.add(a.idempotencyKey);
    added.push(entry);
  }
  return added;
}

export function totalXp(ledger: XpEntry[], userId: string): number {
  return ledger.filter((e) => e.userId === userId).reduce((s, e) => s + e.amount, 0);
}

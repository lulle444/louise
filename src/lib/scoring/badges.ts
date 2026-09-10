import type { Badge, BadgeCode, Lineup, Narrative, RaceResult } from "@/lib/types";

export const BADGES: Badge[] = [
  { code: "first_lineup", name: "First Lineup", description: "Locked your first Race lineup.", icon: "Flag" },
  { code: "winner_called", name: "Winner Called", description: "Your Leader finished 1st.", icon: "Trophy" },
  { code: "wildcard_master", name: "Wildcard Master", description: "A Wildcard gained four or more positions.", icon: "Sparkles" },
  { code: "perfect_podium", name: "Perfect Podium", description: "Leader 1st, Challenger top 3 and Wildcard up in a single Race.", icon: "Medal" },
  { code: "beat_the_ai", name: "Beat the AI", description: "Out-scored all three AI coaches in a settled Race.", icon: "Cpu" },
  { code: "crowd_breaker", name: "Crowd Breaker", description: "Beat the crowd consensus lineup with a different Leader.", icon: "Users" },
  { code: "ai_specialist", name: "AI Specialist", description: "Three correct calls involving the Artificial Intelligence narrative.", icon: "BrainCircuit" },
  { code: "rwa_specialist", name: "RWA Specialist", description: "Three correct calls involving the Real World Assets narrative.", icon: "Landmark" },
  { code: "gaming_specialist", name: "Gaming Specialist", description: "Three correct calls involving the Gaming narrative.", icon: "Gamepad2" },
  { code: "three_race_streak", name: "Three-Race Streak", description: "Locked lineups in three consecutive Races.", icon: "Flame" },
];

export const BADGE_BY_CODE = new Map(BADGES.map((b) => [b.code, b]));

export interface BadgeEvalInput {
  userId: string;
  raceId: string;
  /** Results for this user across all settled Races, including the one just settled, ordered by Race number ascending. */
  userResults: RaceResult[];
  /** Lineups for this user keyed by lineup id. */
  userLineups: Map<string, Lineup>;
  /** All results for this Race (humans and AI). */
  raceResults: RaceResult[];
  /** Crowd consensus Leader narrative id for this Race, if any. */
  crowdLeaderId: string | null;
  /** Consecutive participation streak including this Race. */
  participationStreak: number;
  narratives: Narrative[];
  /** Badge codes the user already holds. */
  held: Set<BadgeCode>;
}

/** Return badge codes newly earned as of this Race. Pure and idempotent. */
export function evaluateBadges(input: BadgeEvalInput): BadgeCode[] {
  const earned: BadgeCode[] = [];
  const has = (c: BadgeCode) => input.held.has(c) || earned.includes(c);
  const give = (c: BadgeCode) => {
    if (!has(c)) earned.push(c);
  };

  const mine = input.userResults.find((r) => r.raceId === input.raceId && r.userId === input.userId);
  if (!mine) return earned;
  const lineup = input.userLineups.get(mine.lineupId);
  if (!lineup) return earned;

  give("first_lineup");
  if (mine.leaderHit) give("winner_called");
  if (mine.wildcardStart - mine.wildcardFinish >= 4) give("wildcard_master");
  if (mine.leaderHit && mine.challengerHit && mine.wildcardHit) give("perfect_podium");

  const aiScores = input.raceResults.filter((r) => r.aiProfileId).map((r) => r.raceScore);
  if (aiScores.length === 3 && aiScores.every((s) => mine.raceScore > s)) give("beat_the_ai");

  if (input.crowdLeaderId) {
    const leaderPick = lineup.picks.find((p) => p.role === "leader");
    const crowdResults = input.raceResults.filter((r) => r.userId && r.userId !== input.userId);
    const crowdAvg = crowdResults.length
      ? crowdResults.reduce((s, r) => s + r.raceScore, 0) / crowdResults.length
      : 0;
    if (leaderPick && leaderPick.narrativeId !== input.crowdLeaderId && mine.raceScore > crowdAvg && mine.leaderHit) {
      give("crowd_breaker");
    }
  }

  const specialist: [string, BadgeCode][] = [
    ["ai", "ai_specialist"],
    ["rwa", "rwa_specialist"],
    ["gaming", "gaming_specialist"],
  ];
  for (const [slug, code] of specialist) {
    const narrative = input.narratives.find((n) => n.slug === slug);
    if (!narrative) continue;
    let correct = 0;
    for (const r of input.userResults) {
      const l = input.userLineups.get(r.lineupId);
      if (!l) continue;
      for (const p of l.picks) {
        if (p.narrativeId !== narrative.id) continue;
        if (
          (p.role === "leader" && r.leaderHit) ||
          (p.role === "challenger" && r.challengerHit) ||
          (p.role === "wildcard" && r.wildcardHit)
        ) {
          correct++;
        }
      }
    }
    if (correct >= 3) give(code);
  }

  if (input.participationStreak >= 3) give("three_race_streak");
  return earned;
}

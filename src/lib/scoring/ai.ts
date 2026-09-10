import type { AiCode, AiProfile, LineupPick, NarrativeSnapshot } from "@/lib/types";

/**
 * Rule-based AI coaches. Each strategy is a deterministic pure function of the
 * pre-lock input snapshot (and, for NOVA, the previous snapshot) so that a
 * lineup can never be generated or revised once final data is known.
 */
export const AI_STRATEGY_VERSION = "ai-rules-v1";

export const AI_PROFILES: AiProfile[] = [
  {
    id: "ai_rotator",
    code: "ROTATOR",
    name: "ROTATOR",
    tagline: "Follows momentum and volume.",
    description:
      "ROTATOR ranks narratives by momentum consistency (60%) and volume change (40%) from the pre-lock snapshot, drafts the top two as Leader and Challenger, and picks its Wildcard from the highest-momentum narrative outside the top four.",
    strategyVersion: AI_STRATEGY_VERSION,
    accentColor: "#22D3EE",
  },
  {
    id: "ai_atlas",
    code: "ATLAS",
    name: "ATLAS",
    tagline: "Balances performance and breadth.",
    description:
      "ATLAS blends normalized price performance (50%) with market breadth (50%). It drafts the top two as Leader and Challenger and picks the widest-breadth narrative ranked 5th or lower as its Wildcard.",
    strategyVersion: AI_STRATEGY_VERSION,
    accentColor: "#8B5CF6",
  },
  {
    id: "ai_nova",
    code: "NOVA",
    name: "NOVA",
    tagline: "Searches for improving underdogs.",
    description:
      "NOVA compares the pre-lock snapshot with the previous week's snapshot. It drafts the two most-improved narratives as Leader and Challenger and picks the lowest-ranked narrative with a positive improvement as its Wildcard.",
    strategyVersion: AI_STRATEGY_VERSION,
    accentColor: "#FB7185",
  },
];

export const AI_ENERGY: Record<AiCode, [number, number, number]> = {
  ROTATOR: [50, 30, 20],
  ATLAS: [45, 35, 20],
  NOVA: [40, 30, 30],
};

function byRankAsc(a: NarrativeSnapshot, b: NarrativeSnapshot) {
  return a.rank - b.rank;
}

function toLineup(code: AiCode, ordered: string[], wildcard: string): LineupPick[] {
  const [le, ce, we] = AI_ENERGY[code];
  const leader = ordered[0];
  const challenger = ordered.find((n) => n !== leader && n !== wildcard) ?? ordered[1];
  return [
    { role: "leader", narrativeId: leader, energy: le },
    { role: "challenger", narrativeId: challenger, energy: ce },
    { role: "wildcard", narrativeId: wildcard, energy: we },
  ];
}

export function buildAiLineup(
  code: AiCode,
  inputSnapshot: NarrativeSnapshot[],
  previousSnapshot: NarrativeSnapshot[] | null,
): LineupPick[] {
  const usable = inputSnapshot.filter((s) => s.quality === "ok");
  if (usable.length < 3) throw new Error("Not enough narratives with usable data to draft an AI lineup");
  const sortedByRank = [...usable].sort(byRankAsc);

  if (code === "ROTATOR") {
    const ranked = [...usable].sort(
      (a, b) =>
        b.normalized.momentum * 0.6 + b.normalized.volume * 0.4 -
          (a.normalized.momentum * 0.6 + a.normalized.volume * 0.4) || a.narrativeId.localeCompare(b.narrativeId),
    );
    const ordered = ranked.map((s) => s.narrativeId);
    const outsideTop4 = sortedByRank.slice(4).sort((a, b) => b.normalized.momentum - a.normalized.momentum);
    const wildcard = (outsideTop4[0] ?? sortedByRank[sortedByRank.length - 1]).narrativeId;
    return toLineup(code, ordered.filter((n) => n !== wildcard), wildcard);
  }

  if (code === "ATLAS") {
    const ranked = [...usable].sort(
      (a, b) =>
        b.normalized.price * 0.5 + b.normalized.breadth * 0.5 -
          (a.normalized.price * 0.5 + a.normalized.breadth * 0.5) || a.narrativeId.localeCompare(b.narrativeId),
    );
    const ordered = ranked.map((s) => s.narrativeId);
    const outsideTop4 = sortedByRank.slice(4).sort((a, b) => b.normalized.breadth - a.normalized.breadth);
    const wildcard = (outsideTop4[0] ?? sortedByRank[sortedByRank.length - 1]).narrativeId;
    return toLineup(code, ordered.filter((n) => n !== wildcard), wildcard);
  }

  // NOVA
  const prev = new Map((previousSnapshot ?? []).map((s) => [s.narrativeId, s]));
  const improvement = usable.map((s) => ({
    narrativeId: s.narrativeId,
    rank: s.rank,
    delta: s.score - (prev.get(s.narrativeId)?.score ?? s.score),
  }));
  const ranked = [...improvement].sort((a, b) => b.delta - a.delta || a.rank - b.rank);
  const ordered = ranked.map((s) => s.narrativeId);
  const positiveUnderdogs = improvement
    .filter((s) => s.delta > 0)
    .sort((a, b) => b.rank - a.rank);
  const notTopTwo = (id: string) => id !== ordered[0] && id !== ordered[1];
  const wildcard =
    positiveUnderdogs.find((s) => notTopTwo(s.narrativeId))?.narrativeId ??
    [...sortedByRank].reverse().find((s) => notTopTwo(s.narrativeId))!.narrativeId;
  return toLineup(code, ordered.filter((n) => n !== wildcard), wildcard);
}

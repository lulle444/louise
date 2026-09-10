import type { Lineup, MetaDNA, Narrative, PickRole, RaceResult } from "@/lib/types";
import type { CrowdPicks } from "@/lib/types";
import { MAX_RACE_SCORE } from "./race-score";

/** Minimum settled Races before official ratings / Meta DNA are shown. */
export const OFFICIAL_SAMPLE_THRESHOLD = 3;

export interface PlayerStats {
  settledRaces: number;
  averageScore: number;
  bestScore: number;
  leaderHits: number;
  challengerHits: number;
  wildcardHits: number;
  leaderAccuracy: number;
  challengerAccuracy: number;
  wildcardAccuracy: number;
  hitRate: number; // share of all picks that hit
  currentStreak: number; // consecutive participation, ending in the latest settled race
  bestLeaderStreak: number;
  metaRating: number;
  provisional: boolean;
}

/**
 * Meta Rating (documented on /methodology):
 *   round(avg race score × 4 + leader accuracy × 300 + challenger accuracy × 150 + wildcard accuracy × 150)
 * Official only after three settled Races; otherwise provisional.
 */
export function metaRating(stats: {
  averageScore: number;
  leaderAccuracy: number;
  challengerAccuracy: number;
  wildcardAccuracy: number;
}): number {
  return Math.round(
    stats.averageScore * 4 +
      stats.leaderAccuracy * 300 +
      stats.challengerAccuracy * 150 +
      stats.wildcardAccuracy * 150,
  );
}

/** Results must be ordered by race number ascending; `raceOrder` is the ordered list of settled race ids. */
export function computePlayerStats(results: RaceResult[], raceOrder: string[]): PlayerStats {
  const settled = results.filter((r) => raceOrder.includes(r.raceId));
  const n = settled.length;
  const leaderHits = settled.filter((r) => r.leaderHit).length;
  const challengerHits = settled.filter((r) => r.challengerHit).length;
  const wildcardHits = settled.filter((r) => r.wildcardHit).length;
  const averageScore = n ? settled.reduce((s, r) => s + r.raceScore, 0) / n : 0;
  const bestScore = n ? Math.max(...settled.map((r) => r.raceScore)) : 0;
  const leaderAccuracy = n ? leaderHits / n : 0;
  const challengerAccuracy = n ? challengerHits / n : 0;
  const wildcardAccuracy = n ? wildcardHits / n : 0;

  // Participation streak ending at the most recent settled race.
  const played = new Set(settled.map((r) => r.raceId));
  let currentStreak = 0;
  for (let i = raceOrder.length - 1; i >= 0; i--) {
    if (played.has(raceOrder[i])) currentStreak++;
    else break;
  }
  let bestLeaderStreak = 0;
  let run = 0;
  for (const id of raceOrder) {
    const r = settled.find((x) => x.raceId === id);
    if (r?.leaderHit) {
      run++;
      bestLeaderStreak = Math.max(bestLeaderStreak, run);
    } else run = 0;
  }

  return {
    settledRaces: n,
    averageScore: Math.round(averageScore * 10) / 10,
    bestScore,
    leaderHits,
    challengerHits,
    wildcardHits,
    leaderAccuracy,
    challengerAccuracy,
    wildcardAccuracy,
    hitRate: n ? (leaderHits + challengerHits + wildcardHits) / (n * 3) : 0,
    currentStreak,
    bestLeaderStreak,
    metaRating: metaRating({ averageScore, leaderAccuracy, challengerAccuracy, wildcardAccuracy }),
    provisional: n < OFFICIAL_SAMPLE_THRESHOLD,
  };
}

export interface MetaDNAInput {
  results: RaceResult[];
  lineups: Map<string, Lineup>;
  /** Crowd picks per race id (human-only aggregation). */
  crowdByRace: Map<string, CrowdPicks>;
  narratives: Narrative[];
}

function emptyDNA(sampleSize: number): MetaDNA {
  return {
    ready: false,
    sampleSize,
    label: null,
    bestNarrativeId: null,
    favoriteNarrativeId: null,
    bestRole: null,
    earlyDiscovery: 0,
    convictionCalibration: 0,
    consensusTendency: 50,
    averageScore: 0,
    axes: [],
  };
}

/**
 * Meta DNA — computed only once a player has enough settled Races.
 */
export function computeMetaDNA(input: MetaDNAInput): MetaDNA {
  const results = input.results;
  const n = results.length;
  if (n < OFFICIAL_SAMPLE_THRESHOLD) return emptyDNA(n);

  // Best narrative: narrative with the most points earned when picked.
  const pointsByNarrative = new Map<string, number>();
  const picksByNarrative = new Map<string, number>();
  const roleTotals: Record<PickRole, number> = { leader: 0, challenger: 0, wildcard: 0 };
  let wildcardGains = 0;
  let calibrationSum = 0;
  let consensusMatches = 0;
  let consensusComparisons = 0;

  for (const r of results) {
    const l = input.lineups.get(r.lineupId);
    if (!l) continue;
    const rolePts: Record<PickRole, number> = {
      leader: r.leaderPoints,
      challenger: r.challengerPoints,
      wildcard: r.wildcardPoints,
    };
    const roleHit: Record<PickRole, boolean> = {
      leader: r.leaderHit,
      challenger: r.challengerHit,
      wildcard: r.wildcardHit,
    };
    for (const p of l.picks) {
      pointsByNarrative.set(p.narrativeId, (pointsByNarrative.get(p.narrativeId) ?? 0) + rolePts[p.role]);
      picksByNarrative.set(p.narrativeId, (picksByNarrative.get(p.narrativeId) ?? 0) + 1);
      roleTotals[p.role] += rolePts[p.role];
      // Calibration: high energy on hits and low energy on misses both count as calibrated.
      const share = p.energy / 100;
      calibrationSum += roleHit[p.role] ? share : 1 - share;
    }
    wildcardGains += Math.max(0, r.wildcardStart - r.wildcardFinish);

    const crowd = input.crowdByRace.get(r.raceId);
    const crowdLeader = crowd?.byRole.leader[0]?.narrativeId;
    const myLeader = l.picks.find((p) => p.role === "leader")?.narrativeId;
    if (crowdLeader && myLeader) {
      consensusComparisons++;
      if (crowdLeader === myLeader) consensusMatches++;
    }
  }

  const bestNarrativeId =
    [...pointsByNarrative.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  const favoriteNarrativeId =
    [...picksByNarrative.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  const bestRole = (Object.entries(roleTotals) as [PickRole, number][]).sort((a, b) => b[1] - a[1])[0][0];

  const earlyDiscovery = Math.round(Math.min(100, (wildcardGains / (n * 4)) * 100));
  const convictionCalibration = Math.round(Math.min(100, (calibrationSum / (n * 3)) * 100));
  const consensusTendency = consensusComparisons
    ? Math.round((consensusMatches / consensusComparisons) * 100)
    : 50;
  const averageScore = results.reduce((s, r) => s + r.raceScore, 0) / n;
  const scoreAxis = Math.round((averageScore / MAX_RACE_SCORE) * 100);
  const leaderAxis = Math.round((results.filter((r) => r.leaderHit).length / n) * 100);

  let label: MetaDNA["label"] = "Balanced Strategist";
  if (earlyDiscovery >= 55) label = "Early Hunter";
  else if (bestRole === "wildcard" && earlyDiscovery >= 35) label = "Wildcard Scout";
  else if (consensusTendency <= 30) label = "Contrarian";
  else if (consensusTendency >= 70) label = "Consensus Navigator";
  else if (leaderAxis >= 50) label = "Rotation Reader";

  return {
    ready: true,
    sampleSize: n,
    label,
    bestNarrativeId,
    favoriteNarrativeId,
    bestRole,
    earlyDiscovery,
    convictionCalibration,
    consensusTendency,
    averageScore: Math.round(averageScore * 10) / 10,
    axes: [
      { key: "leader", label: "Leader calls", value: leaderAxis },
      { key: "early", label: "Early discovery", value: earlyDiscovery },
      { key: "calibration", label: "Conviction calibration", value: convictionCalibration },
      { key: "contrarian", label: "Contrarian", value: 100 - consensusTendency },
      { key: "score", label: "Finishing score", value: scoreAxis },
    ],
  };
}

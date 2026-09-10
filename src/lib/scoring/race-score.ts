import type { LineupPick, PickRole } from "@/lib/types";

/**
 * Race scoring — pure and fully documented on /methodology.
 *
 * Base points
 *   Leader      finishes 1st: 100 · 2nd: 40 · 3rd: 20 · otherwise 0
 *   Challenger  finishes in the top 3: 60 · 4th: 20 · otherwise 0
 *   Wildcard    finishes above its starting rank: 20 per position gained,
 *               capped at 80 (i.e. 4+ positions = full 80)
 *
 * Energy multiplier
 *   multiplier = 0.5 + energy / 100   (0 Energy → ×0.5, 100 Energy → ×1.5)
 *
 * Role caps (published): Leader 150 · Challenger 90 · Wildcard 120
 *   role_points = min(cap, base × multiplier)
 *
 * race_score = leader_points + challenger_points + wildcard_points  (max 360)
 */
export const RACE_FORMULA_VERSION = "rs-v1";

export const ROLE_CAPS: Record<PickRole, number> = {
  leader: 150,
  challenger: 90,
  wildcard: 120,
};

export const MAX_RACE_SCORE = ROLE_CAPS.leader + ROLE_CAPS.challenger + ROLE_CAPS.wildcard;

export function energyMultiplier(energy: number): number {
  const e = Math.min(100, Math.max(0, energy));
  return 0.5 + e / 100;
}

export function leaderBase(finish: number): number {
  if (finish === 1) return 100;
  if (finish === 2) return 40;
  if (finish === 3) return 20;
  return 0;
}

export function challengerBase(finish: number): number {
  if (finish >= 1 && finish <= 3) return 60;
  if (finish === 4) return 20;
  return 0;
}

export function wildcardBase(startRank: number, finishRank: number): number {
  const gained = startRank - finishRank;
  if (gained <= 0) return 0;
  return Math.min(80, gained * 20);
}

export function rolePoints(role: PickRole, base: number, energy: number): number {
  const raw = base * energyMultiplier(energy);
  return Math.round(Math.min(ROLE_CAPS[role], raw) * 100) / 100;
}

export interface FinalStanding {
  narrativeId: string;
  finishRank: number;
  startRank: number;
}

export interface RaceScoreBreakdown {
  raceScore: number;
  leaderPoints: number;
  challengerPoints: number;
  wildcardPoints: number;
  leaderFinish: number;
  challengerFinish: number;
  wildcardFinish: number;
  wildcardStart: number;
  leaderHit: boolean;
  challengerHit: boolean;
  wildcardHit: boolean;
  bestRole: PickRole | null;
  formulaVersion: string;
}

function findPick(picks: LineupPick[], role: PickRole): LineupPick {
  const p = picks.find((x) => x.role === role);
  if (!p) throw new Error(`Lineup is missing a ${role} pick`);
  return p;
}

/**
 * Score a lineup against final standings. Deterministic; calling it twice with
 * the same inputs returns the same breakdown, which is what makes settlement
 * idempotent.
 */
export function scoreLineup(picks: LineupPick[], standings: FinalStanding[]): RaceScoreBreakdown {
  const byId = new Map(standings.map((s) => [s.narrativeId, s]));
  const leader = findPick(picks, "leader");
  const challenger = findPick(picks, "challenger");
  const wildcard = findPick(picks, "wildcard");

  const lf = byId.get(leader.narrativeId);
  const cf = byId.get(challenger.narrativeId);
  const wf = byId.get(wildcard.narrativeId);
  if (!lf || !cf || !wf) throw new Error("Lineup references a narrative not in the standings");

  const leaderPoints = rolePoints("leader", leaderBase(lf.finishRank), leader.energy);
  const challengerPoints = rolePoints("challenger", challengerBase(cf.finishRank), challenger.energy);
  const wildcardPoints = rolePoints(
    "wildcard",
    wildcardBase(wf.startRank, wf.finishRank),
    wildcard.energy,
  );

  const rolePts: [PickRole, number][] = [
    ["leader", leaderPoints],
    ["challenger", challengerPoints],
    ["wildcard", wildcardPoints],
  ];
  const best = rolePts.reduce((a, b) => (b[1] > a[1] ? b : a));

  return {
    raceScore: Math.round((leaderPoints + challengerPoints + wildcardPoints) * 100) / 100,
    leaderPoints,
    challengerPoints,
    wildcardPoints,
    leaderFinish: lf.finishRank,
    challengerFinish: cf.finishRank,
    wildcardFinish: wf.finishRank,
    wildcardStart: wf.startRank,
    leaderHit: lf.finishRank === 1,
    challengerHit: cf.finishRank <= 3,
    wildcardHit: wf.finishRank < wf.startRank,
    bestRole: best[1] > 0 ? best[0] : null,
    formulaVersion: RACE_FORMULA_VERSION,
  };
}

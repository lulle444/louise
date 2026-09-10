import type { SnapshotComponents, SnapshotRaw } from "@/lib/types";

/**
 * Narrative Score — a transparent, normalized 0–100 composite.
 *
 *   narrative_score = price*0.40 + breadth*0.25 + volume*0.20 + momentum*0.15
 *
 * Every component is normalized to 0–100 with the documented bounds below.
 * The formula version is stored on every snapshot so historical Races stay
 * reproducible if the weights or bounds ever change.
 */
export const NARRATIVE_FORMULA_VERSION = "ns-v1";

export const NARRATIVE_WEIGHTS = {
  price: 0.4,
  breadth: 0.25,
  volume: 0.2,
  momentum: 0.15,
} as const;

/** Normalization bounds (documented publicly on /methodology). */
export const NORMALIZATION_BOUNDS = {
  /** Equal-weighted price change over the Race window, in percent. */
  priceChangePct: { min: -25, max: 25 },
  /** Change in average daily volume vs the prior window, in percent. */
  volumeChangePct: { min: -50, max: 100 },
} as const;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Linear 0–100 mapping of value between min and max (clamped). */
export function normalizeLinear(value: number, min: number, max: number): number {
  if (max <= min) throw new Error("normalizeLinear: max must exceed min");
  const v = clamp(value, min, max);
  return round2(((v - min) / (max - min)) * 100);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizeComponents(raw: SnapshotRaw): SnapshotComponents {
  return {
    price: normalizeLinear(
      raw.priceChangePct,
      NORMALIZATION_BOUNDS.priceChangePct.min,
      NORMALIZATION_BOUNDS.priceChangePct.max,
    ),
    breadth: round2(clamp(raw.breadthShare, 0, 1) * 100),
    volume: normalizeLinear(
      raw.volumeChangePct,
      NORMALIZATION_BOUNDS.volumeChangePct.min,
      NORMALIZATION_BOUNDS.volumeChangePct.max,
    ),
    momentum: round2(clamp(raw.momentumConsistency, 0, 1) * 100),
  };
}

export function narrativeScore(c: SnapshotComponents): number {
  const score =
    c.price * NARRATIVE_WEIGHTS.price +
    c.breadth * NARRATIVE_WEIGHTS.breadth +
    c.volume * NARRATIVE_WEIGHTS.volume +
    c.momentum * NARRATIVE_WEIGHTS.momentum;
  return round2(clamp(score, 0, 100));
}

export function scoreFromRaw(raw: SnapshotRaw): { normalized: SnapshotComponents; score: number } {
  const normalized = normalizeComponents(raw);
  return { normalized, score: narrativeScore(normalized) };
}

/** Rank an array of {narrativeId, score} descending. Ties broken by id for determinism. */
export function rankScores<T extends { narrativeId: string; score: number }>(
  rows: T[],
): (T & { rank: number })[] {
  const sorted = [...rows].sort(
    (a, b) => b.score - a.score || a.narrativeId.localeCompare(b.narrativeId),
  );
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Validate raw provider inputs: all values must be finite numbers. */
export function isValidRaw(raw: SnapshotRaw): boolean {
  return (
    Number.isFinite(raw.priceChangePct) &&
    Number.isFinite(raw.breadthShare) &&
    Number.isFinite(raw.volumeChangePct) &&
    Number.isFinite(raw.momentumConsistency)
  );
}

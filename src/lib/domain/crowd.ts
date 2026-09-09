import type { Direction } from "./types";

export interface CrowdSignal {
  total: number;
  counts: Record<Direction, number>;
  percentages: Record<Direction, number>;
  /** Direction with the most votes; null when there are no votes or a tie at zero. */
  majority: Direction | null;
}

/**
 * Aggregate locked human predictions by direction.
 * Callers must pass human predictions only — AI predictions are never part of
 * the Crowd Signal.
 */
export function aggregateCrowd(
  predictions: Array<{ direction: Direction }>,
): CrowdSignal {
  const counts: Record<Direction, number> = { bullish: 0, neutral: 0, bearish: 0 };
  for (const p of predictions) counts[p.direction]++;
  const total = predictions.length;
  const percentages: Record<Direction, number> = {
    bullish: total ? Math.round((counts.bullish / total) * 100) : 0,
    neutral: total ? Math.round((counts.neutral / total) * 100) : 0,
    bearish: total ? Math.round((counts.bearish / total) * 100) : 0,
  };
  let majority: Direction | null = null;
  if (total > 0) {
    const ordered = (Object.keys(counts) as Direction[]).sort((a, b) => counts[b] - counts[a]);
    majority = counts[ordered[0]] > counts[ordered[1]] ? ordered[0] : ordered[0];
  }
  return { total, counts, percentages, majority };
}

/**
 * Whether a viewer may see exact crowd percentages for a Battle.
 * Revealed once the viewer has locked, or once the Battle is no longer open.
 */
export function canRevealCrowd(input: {
  viewerHasLocked: boolean;
  battleAcceptingPredictions: boolean;
}): boolean {
  return input.viewerHasLocked || !input.battleAcceptingPredictions;
}

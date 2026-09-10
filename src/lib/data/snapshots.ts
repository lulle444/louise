import type { Constituent, SnapshotRaw } from "@/lib/types";
import { isValidRaw } from "@/lib/scoring/narrative-score";
import type { MarketDataProvider, SeriesPoint } from "./provider";
import { isValidPoint } from "./provider";

/** Constituent weights are capped so that no single asset dominates a narrative. */
export const MAX_CONSTITUENT_WEIGHT = 0.35;

export function cappedWeights(constituents: Constituent[]): Map<string, number> {
  let weights = constituents.map((c) => ({ symbol: c.symbol, w: c.weight }));
  // Iteratively cap and redistribute.
  for (let iter = 0; iter < 10; iter++) {
    const total = weights.reduce((s, x) => s + x.w, 0) || 1;
    weights = weights.map((x) => ({ ...x, w: x.w / total }));
    const over = weights.filter((x) => x.w > MAX_CONSTITUENT_WEIGHT);
    if (!over.length) break;
    const excess = over.reduce((s, x) => s + (x.w - MAX_CONSTITUENT_WEIGHT), 0);
    const under = weights.filter((x) => x.w <= MAX_CONSTITUENT_WEIGHT);
    const underTotal = under.reduce((s, x) => s + x.w, 0) || 1;
    weights = weights.map((x) =>
      x.w > MAX_CONSTITUENT_WEIGHT
        ? { ...x, w: MAX_CONSTITUENT_WEIGHT }
        : { ...x, w: x.w + excess * (x.w / underTotal) },
    );
  }
  return new Map(weights.map((x) => [x.symbol, x.w]));
}

export interface WindowSpec {
  /** Start of the scoring window. */
  fromIso: string;
  /** Point in time being scored. */
  atIso: string;
}

function pointAtOrBefore(series: SeriesPoint[], iso: string): SeriesPoint | null {
  const t = Date.parse(iso);
  let best: SeriesPoint | null = null;
  for (const p of series) {
    if (Date.parse(p.t) <= t) best = p;
    else break;
  }
  return best;
}

function within(series: SeriesPoint[], fromIso: string, toIso: string): SeriesPoint[] {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return series.filter((p) => {
    const t = Date.parse(p.t);
    return t >= a && t <= b;
  });
}

export interface NarrativeRawResult {
  raw: SnapshotRaw;
  quality: "ok" | "unavailable";
  reason?: string;
  perAsset: { symbol: string; weight: number; changePct: number | null }[];
}

/**
 * Compute raw narrative inputs for a window using capped weighting.
 *
 * - price change: weighted average of constituent % change from window start
 * - breadth: share of constituents with a positive change
 * - volume change: average volume in the window vs the equally long prior window
 * - momentum consistency: share of steps in which the weighted index rose
 */
export async function computeNarrativeRaw(
  provider: MarketDataProvider,
  constituents: Constituent[],
  window: WindowSpec,
): Promise<NarrativeRawResult> {
  const weights = cappedWeights(constituents);
  const fromMs = Date.parse(window.fromIso);
  const atMs = Date.parse(window.atIso);
  const spanMs = atMs - fromMs;
  const priorFromIso = new Date(fromMs - spanMs).toISOString();

  const perAsset: NarrativeRawResult["perAsset"] = [];
  const stepsBySymbol = new Map<string, SeriesPoint[]>();
  let priceSum = 0;
  let weightUsed = 0;
  let positive = 0;
  let counted = 0;
  let volWindow = 0;
  let volPrior = 0;

  for (const c of constituents) {
    const w = weights.get(c.symbol) ?? 0;
    const series = (await provider.getSeries(c.symbol, priorFromIso, window.atIso)).filter(isValidPoint);
    const start = pointAtOrBefore(series, window.fromIso);
    const end = pointAtOrBefore(series, window.atIso);
    if (!start || !end || start.close <= 0) {
      perAsset.push({ symbol: c.symbol, weight: w, changePct: null });
      continue;
    }
    const changePct = (end.close / start.close - 1) * 100;
    perAsset.push({ symbol: c.symbol, weight: w, changePct });
    priceSum += changePct * w;
    weightUsed += w;
    counted++;
    if (changePct > 0) positive++;

    const inWindow = within(series, window.fromIso, window.atIso);
    const prior = within(series, priorFromIso, window.fromIso).filter((p) => Date.parse(p.t) < fromMs);
    const avg = (pts: SeriesPoint[]) => (pts.length ? pts.reduce((s, p) => s + p.volume, 0) / pts.length : 0);
    volWindow += avg(inWindow) * w;
    volPrior += avg(prior) * w;
    stepsBySymbol.set(c.symbol, inWindow);
  }

  if (counted < Math.max(2, Math.ceil(constituents.length * 0.6)) || weightUsed <= 0) {
    return {
      raw: { priceChangePct: 0, breadthShare: 0, volumeChangePct: 0, momentumConsistency: 0 },
      quality: "unavailable",
      reason: "Insufficient constituent data",
      perAsset,
    };
  }

  // Momentum consistency: build a weighted index across aligned steps.
  const timestamps = [...new Set([...stepsBySymbol.values()].flat().map((p) => p.t))].sort();
  let ups = 0;
  let intervals = 0;
  let prevIndex: number | null = null;
  for (const t of timestamps) {
    let idx = 0;
    let wsum = 0;
    for (const c of constituents) {
      const pts = stepsBySymbol.get(c.symbol);
      const p = pts?.find((x) => x.t === t);
      const first = pts?.[0];
      if (!p || !first || first.close <= 0) continue;
      const w = weights.get(c.symbol) ?? 0;
      idx += (p.close / first.close) * w;
      wsum += w;
    }
    if (wsum <= 0) continue;
    idx /= wsum;
    if (prevIndex !== null) {
      intervals++;
      if (idx > prevIndex) ups++;
    }
    prevIndex = idx;
  }

  const raw: SnapshotRaw = {
    priceChangePct: priceSum / weightUsed,
    breadthShare: counted ? positive / counted : 0,
    volumeChangePct: volPrior > 0 ? (volWindow / volPrior - 1) * 100 : 0,
    momentumConsistency: intervals > 0 ? ups / intervals : 0.5,
  };
  if (!isValidRaw(raw)) {
    return { raw, quality: "unavailable", reason: "Non-finite inputs", perAsset };
  }
  return { raw, quality: "ok", perAsset };
}

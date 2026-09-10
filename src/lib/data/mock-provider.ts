import { hashString, mulberry32, noise } from "@/lib/prng";
import type { MarketDataProvider, SeriesPoint } from "./provider";

/**
 * Deterministic mock provider used by Demo Mode and tests.
 *
 * Prices follow a seeded random walk at 6-hour steps from a fixed epoch so that
 * any (symbol, timestamp) pair always resolves to the same value. Each symbol
 * carries a narrative-level "story" drift that changes week by week, which is
 * what makes different narratives win different demo Races.
 */
export const MOCK_EPOCH_MS = Date.UTC(2025, 0, 6); // Monday 6 Jan 2025
export const MOCK_STEP_MS = 6 * 60 * 60 * 1000;

export interface MockAssetConfig {
  symbol: string;
  narrativeSlug: string;
  basePrice: number;
  baseVolume: number;
  volatility: number; // per-step stdev in fraction
}

const seriesCache = new Map<string, { points: SeriesPoint[]; rand: () => number; price: number }>();

export function stepIndex(ms: number): number {
  return Math.floor((ms - MOCK_EPOCH_MS) / MOCK_STEP_MS);
}

export function stepToMs(index: number): number {
  return MOCK_EPOCH_MS + index * MOCK_STEP_MS;
}

const weekNoise = new Map<string, number>();
function cachedNoise(key: string): number {
  let v = weekNoise.get(key);
  if (v === undefined) {
    v = noise(key);
    weekNoise.set(key, v);
  }
  return v;
}

/** Deterministic weekly drift for a narrative. Returns a per-step fraction. */
export function narrativeWeeklyDrift(narrativeSlug: string, weekIndex: number): number {
  // Between roughly -0.35% and +0.35% per 6h step, i.e. about ±10% per week.
  return cachedNoise(`drift:${narrativeSlug}:${weekIndex}`) * 0.0035;
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildSeries(cfg: MockAssetConfig, untilIndex: number): SeriesPoint[] {
  let state = seriesCache.get(cfg.symbol);
  if (!state) {
    state = { points: [], rand: mulberry32(hashString(`series:${cfg.symbol}`)), price: cfg.basePrice };
    seriesCache.set(cfg.symbol, state);
  }
  if (state.points.length > untilIndex) return state.points;
  // Extend the walk in place; the generator continues from where it stopped so
  // values depend only on (symbol, step index), never on request order.
  const { points, rand } = state;
  let price = state.price;
  for (let i = points.length; i <= untilIndex; i++) {
    const ms = stepToMs(i);
    const week = Math.floor(i / 28);
    const drift = narrativeWeeklyDrift(cfg.narrativeSlug, week);
    const shock = gaussian(rand) * cfg.volatility;
    price = Math.max(cfg.basePrice * 0.05, price * (1 + drift + shock));
    const volumeNoise = 1 + gaussian(rand) * 0.35;
    const weekVolumeBias = 1 + cachedNoise(`vol:${cfg.narrativeSlug}:${week}`) * 0.4;
    const volume = Math.max(1, cfg.baseVolume * Math.max(0.2, volumeNoise) * weekVolumeBias);
    points.push({ t: new Date(ms).toISOString(), close: price, volume });
  }
  state.price = price;
  return points;
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly name = "mock-deterministic-v1";
  readonly isLive = false;
  private configs: Map<string, MockAssetConfig>;

  constructor(configs: MockAssetConfig[]) {
    this.configs = new Map(configs.map((c) => [c.symbol, c]));
  }

  async getSeries(symbol: string, fromIso: string, toIso: string): Promise<SeriesPoint[]> {
    const cfg = this.configs.get(symbol);
    if (!cfg) return [];
    const from = stepIndex(Date.parse(fromIso));
    const to = stepIndex(Date.parse(toIso));
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
    const series = buildSeries(cfg, to);
    return series.slice(Math.max(0, from), to + 1);
  }
}

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

const seriesCache = new Map<string, SeriesPoint[]>();

export function stepIndex(ms: number): number {
  return Math.floor((ms - MOCK_EPOCH_MS) / MOCK_STEP_MS);
}

export function stepToMs(index: number): number {
  return MOCK_EPOCH_MS + index * MOCK_STEP_MS;
}

/** Deterministic weekly drift for a narrative. Returns a per-step fraction. */
export function narrativeWeeklyDrift(narrativeSlug: string, weekIndex: number): number {
  // Between roughly -0.35% and +0.35% per 6h step, i.e. about ±10% per week.
  return noise(`drift:${narrativeSlug}:${weekIndex}`) * 0.0035;
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildSeries(cfg: MockAssetConfig, untilIndex: number): SeriesPoint[] {
  const cacheKey = cfg.symbol;
  const existing = seriesCache.get(cacheKey);
  if (existing && existing.length > untilIndex) return existing;

  const rand = mulberry32(hashString(`series:${cfg.symbol}`));
  const points: SeriesPoint[] = existing ? [...existing] : [];
  let price = points.length ? points[points.length - 1].close : cfg.basePrice;
  // Re-seed by advancing the generator deterministically to the resume point.
  for (let i = 0; i < points.length * 2; i++) rand();
  for (let i = points.length; i <= untilIndex; i++) {
    const ms = stepToMs(i);
    const week = Math.floor(i / 28);
    const drift = narrativeWeeklyDrift(cfg.narrativeSlug, week);
    const shock = gaussian(rand) * cfg.volatility;
    price = Math.max(cfg.basePrice * 0.05, price * (1 + drift + shock));
    const volumeNoise = 1 + gaussian(rand) * 0.35;
    const weekVolumeBias = 1 + noise(`vol:${cfg.narrativeSlug}:${week}`) * 0.4;
    const volume = Math.max(1, cfg.baseVolume * Math.max(0.2, volumeNoise) * weekVolumeBias);
    points.push({ t: new Date(ms).toISOString(), close: price, volume });
  }
  seriesCache.set(cacheKey, points);
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

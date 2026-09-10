/**
 * Market data provider interface.
 *
 * Providers return a time series of (timestamp, close, volume) points for an
 * asset symbol. Snapshot computation is provider-agnostic; every snapshot
 * stores the provider `source` name and the `takenAt` timestamp.
 */
export interface SeriesPoint {
  /** ISO timestamp (UTC). */
  t: string;
  close: number;
  volume: number;
}

export interface MarketDataProvider {
  readonly name: string;
  /** Whether the provider returns real market data (false for the deterministic mock). */
  readonly isLive: boolean;
  /** Return points in [from, to] at the provider's native cadence, ascending by time. */
  getSeries(symbol: string, fromIso: string, toIso: string): Promise<SeriesPoint[]>;
}

export function isValidPoint(p: SeriesPoint): boolean {
  return Number.isFinite(p.close) && p.close > 0 && Number.isFinite(p.volume) && p.volume >= 0;
}

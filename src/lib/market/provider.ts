import type { AssetSymbol } from "../domain/types";

export interface MarketPrice {
  assetSymbol: AssetSymbol;
  price: number;
  /** ISO timestamp the provider reports for the price. */
  timestamp: string;
  source: string;
}

export interface PricePoint {
  time: string;
  price: number;
}

export interface MarketDataProvider {
  readonly name: string;
  /** True when values are simulated rather than live market data. */
  readonly isMock: boolean;
  getCurrentPrice(symbol: AssetSymbol): Promise<MarketPrice>;
  getHistoricalPrice(symbol: AssetSymbol, timestamp: Date): Promise<MarketPrice>;
  /** Evenly spaced series between two timestamps, oldest first. */
  getPriceSeries(symbol: AssetSymbol, from: Date, to: Date, points: number): Promise<PricePoint[]>;
}

export class MarketDataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "MarketDataError";
  }
}

export function assertValidPrice(price: unknown, context: string): number {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new MarketDataError(`Invalid price from provider (${context}): ${String(price)}`);
  }
  return price;
}

/** Tiny in-memory TTL cache to keep API usage polite. */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expires: number }>();
  constructor(private ttlMs: number) {}
  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: V): void {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

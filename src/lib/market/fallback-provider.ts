import { MarketDataError, type MarketDataProvider, type MarketPrice, type PricePoint } from "./provider";
import type { AssetSymbol } from "../domain/types";

/** Tries each provider in order and returns the first successful answer. */
export class FallbackProvider implements MarketDataProvider {
  readonly isMock = false;
  constructor(private readonly providers: MarketDataProvider[]) {}

  get name(): string {
    return this.providers.map((p) => p.name).join("+");
  }

  private async first<T>(call: (p: MarketDataProvider) => Promise<T>, accept: (v: T) => boolean = () => true): Promise<T> {
    const errors: unknown[] = [];
    for (const p of this.providers) {
      try {
        const value = await call(p);
        if (accept(value)) return value;
        errors.push(new MarketDataError(`${p.name} returned no data`));
      } catch (err) {
        errors.push(err);
      }
    }
    throw new MarketDataError(`All market data providers failed: ${errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; ")}`, errors);
  }

  getCurrentPrice(symbol: AssetSymbol): Promise<MarketPrice> {
    return this.first((p) => p.getCurrentPrice(symbol));
  }

  getHistoricalPrice(symbol: AssetSymbol, timestamp: Date): Promise<MarketPrice> {
    return this.first((p) => p.getHistoricalPrice(symbol, timestamp));
  }

  getPriceSeries(symbol: AssetSymbol, from: Date, to: Date, points: number): Promise<PricePoint[]> {
    return this.first((p) => p.getPriceSeries(symbol, from, to, points), (s) => s.length > 0);
  }
}

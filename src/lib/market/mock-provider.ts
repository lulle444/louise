import { hashString, smoothNoise } from "../domain/random";
import type { AssetSymbol } from "../domain/types";
import type { MarketDataProvider, MarketPrice, PricePoint } from "./provider";

/**
 * Deterministic simulated market data for Demo Mode and tests.
 * Prices are a smooth function of (symbol, time) so every request for the
 * same timestamp returns the same value across refreshes and server restarts.
 * Values are clearly labelled as simulated and are never presented as live.
 */

const BASE: Record<AssetSymbol, number> = { BTC: 64250, ETH: 3180, SOL: 148.5 };
const DAY = 86_400_000;

export function simulatedPrice(symbol: AssetSymbol, timeMs: number): number {
  const seed = hashString(`signal-arena:${symbol}`);
  const d = timeMs / DAY; // days since epoch, fractional
  // Layered noise: slow trend (weeks), daily swings, intraday texture.
  const slow = smoothNoise(seed ^ 0x1111, d / 9) * 0.09;
  const daily = smoothNoise(seed ^ 0x2222, d) * 0.028;
  const intraday = smoothNoise(seed ^ 0x3333, d * 6) * 0.007;
  const cycle = Math.sin(d / 5.3) * 0.02 + Math.sin(d / 1.7 + seed % 7) * 0.006;
  const factor = 1 + slow + daily + intraday + cycle;
  const price = BASE[symbol] * factor;
  const decimals = symbol === "SOL" ? 3 : 2;
  return Number(price.toFixed(decimals));
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly name = "simulated";
  readonly isMock = true;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async getCurrentPrice(symbol: AssetSymbol): Promise<MarketPrice> {
    const t = this.now();
    return { assetSymbol: symbol, price: simulatedPrice(symbol, t.getTime()), timestamp: t.toISOString(), source: this.name };
  }

  async getHistoricalPrice(symbol: AssetSymbol, timestamp: Date): Promise<MarketPrice> {
    return {
      assetSymbol: symbol,
      price: simulatedPrice(symbol, timestamp.getTime()),
      timestamp: timestamp.toISOString(),
      source: this.name,
    };
  }

  async getPriceSeries(symbol: AssetSymbol, from: Date, to: Date, points: number): Promise<PricePoint[]> {
    const n = Math.max(2, points);
    const start = from.getTime();
    const end = to.getTime();
    const out: PricePoint[] = [];
    for (let i = 0; i < n; i++) {
      const t = start + ((end - start) * i) / (n - 1);
      out.push({ time: new Date(t).toISOString(), price: simulatedPrice(symbol, t) });
    }
    return out;
  }
}

import type { AssetSymbol } from "../domain/types";
import { assertValidPrice, MarketDataError, TtlCache, type MarketDataProvider, type MarketPrice, type PricePoint } from "./provider";

/** Candle row from the Coinbase Exchange API: [time (s), low, high, open, close, volume], newest first. */
type Candle = [number, number, number, number, number, number];

/**
 * Coinbase-backed provider (no API key). Used as a fallback when CoinGecko's
 * public endpoint rate-limits shared hosting IPs.
 */
export class CoinbaseProvider implements MarketDataProvider {
  readonly name = "coinbase";
  readonly isMock = false;
  private currentCache = new TtlCache<MarketPrice>(60_000);
  private historyCache = new TtlCache<MarketPrice>(6 * 3600_000);
  private seriesCache = new TtlCache<PricePoint[]>(10 * 60_000);

  private async request(url: string): Promise<unknown> {
    const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "alphr" }, cache: "no-store" });
    if (!res.ok) throw new MarketDataError(`Coinbase responded ${res.status}`);
    return res.json();
  }

  private async candles(symbol: AssetSymbol, from: Date, to: Date, granularity: number): Promise<Candle[]> {
    const url = `https://api.exchange.coinbase.com/products/${symbol}-USD/candles?granularity=${granularity}&start=${from.toISOString()}&end=${to.toISOString()}`;
    const data = await this.request(url);
    if (!Array.isArray(data)) throw new MarketDataError(`Unexpected Coinbase candles for ${symbol}`);
    return (data as Candle[]).filter((c) => Array.isArray(c) && Number.isFinite(c[4]) && c[4] > 0).sort((a, b) => a[0] - b[0]);
  }

  async getCurrentPrice(symbol: AssetSymbol): Promise<MarketPrice> {
    const cached = this.currentCache.get(symbol);
    if (cached) return cached;
    const data = (await this.request(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`)) as { data?: { amount?: string } };
    const price = assertValidPrice(Number(data.data?.amount), `${symbol} current`);
    const result: MarketPrice = { assetSymbol: symbol, price, timestamp: new Date().toISOString(), source: this.name };
    this.currentCache.set(symbol, result);
    return result;
  }

  async getHistoricalPrice(symbol: AssetSymbol, timestamp: Date): Promise<MarketPrice> {
    const key = `${symbol}:${Math.floor(timestamp.getTime() / 60_000)}`;
    const cached = this.historyCache.get(key);
    if (cached) return cached;
    const rows = await this.candles(symbol, new Date(timestamp.getTime() - 3600_000), new Date(timestamp.getTime() + 3600_000), 300);
    if (rows.length === 0) throw new MarketDataError(`No historical prices for ${symbol} around ${timestamp.toISOString()}`);
    // Candle whose open time is closest to the timestamp; its open price is the price at that moment.
    const target = timestamp.getTime() / 1000;
    let best = rows[0];
    for (const c of rows) if (Math.abs(c[0] - target) < Math.abs(best[0] - target)) best = c;
    const price = assertValidPrice(best[3], `${symbol} historical`);
    const result: MarketPrice = { assetSymbol: symbol, price, timestamp: new Date(best[0] * 1000).toISOString(), source: this.name };
    this.historyCache.set(key, result);
    return result;
  }

  async getPriceSeries(symbol: AssetSymbol, from: Date, to: Date, points: number): Promise<PricePoint[]> {
    const key = `${symbol}:${Math.floor(from.getTime() / 600_000)}:${Math.floor(to.getTime() / 600_000)}:${points}`;
    const cached = this.seriesCache.get(key);
    if (cached) return cached;
    // Coinbase returns at most 300 candles; pick the finest supported granularity that fits.
    const span = (to.getTime() - from.getTime()) / 1000;
    const granularity = [60, 300, 900, 3600, 21600, 86400].find((g) => span / g <= 300) ?? 86400;
    const raw = (await this.candles(symbol, from, to, granularity)).map((c) => ({ time: new Date(c[0] * 1000).toISOString(), price: c[4] }));
    const step = Math.max(1, Math.floor(raw.length / points));
    const series = raw.filter((_, i) => i % step === 0);
    this.seriesCache.set(key, series);
    return series;
  }
}

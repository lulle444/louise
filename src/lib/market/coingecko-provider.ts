import { ASSETS } from "../domain/catalogue";
import type { AssetSymbol } from "../domain/types";
import { assertValidPrice, MarketDataError, TtlCache, type MarketDataProvider, type MarketPrice, type PricePoint } from "./provider";

/**
 * CoinGecko-backed provider. Works without an API key on the public endpoint
 * (subject to rate limits); set MARKET_DATA_API_KEY to use a demo/pro key.
 */
export class CoinGeckoProvider implements MarketDataProvider {
  readonly name = "coingecko";
  readonly isMock = false;
  private currentCache = new TtlCache<MarketPrice>(60_000);
  private historyCache = new TtlCache<MarketPrice>(6 * 3600_000);
  private seriesCache = new TtlCache<PricePoint[]>(10 * 60_000);

  constructor(private readonly apiKey?: string) {}

  private providerId(symbol: AssetSymbol): string {
    const asset = ASSETS.find((a) => a.symbol === symbol);
    if (!asset) throw new MarketDataError(`Unknown asset ${symbol}`);
    return asset.providerId;
  }

  private async request(path: string): Promise<unknown> {
    const base = this.apiKey ? "https://api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.apiKey) headers["x-cg-demo-api-key"] = this.apiKey;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${base}${path}`, { headers, cache: "no-store" });
        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        if (!res.ok) throw new MarketDataError(`CoinGecko responded ${res.status}`);
        return await res.json();
      } catch (err) {
        lastError = err;
      }
    }
    throw new MarketDataError("CoinGecko request failed after retries", lastError);
  }

  async getCurrentPrice(symbol: AssetSymbol): Promise<MarketPrice> {
    const cached = this.currentCache.get(symbol);
    if (cached) return cached;
    const id = this.providerId(symbol);
    const data = (await this.request(`/simple/price?ids=${id}&vs_currencies=usd&include_last_updated_at=true`)) as Record<string, { usd?: number; last_updated_at?: number }>;
    const row = data[id];
    const price = assertValidPrice(row?.usd, `${symbol} current`);
    const ts = row?.last_updated_at ? new Date(row.last_updated_at * 1000) : new Date();
    const result: MarketPrice = { assetSymbol: symbol, price, timestamp: ts.toISOString(), source: this.name };
    this.currentCache.set(symbol, result);
    return result;
  }

  async getHistoricalPrice(symbol: AssetSymbol, timestamp: Date): Promise<MarketPrice> {
    const key = `${symbol}:${Math.floor(timestamp.getTime() / 60_000)}`;
    const cached = this.historyCache.get(key);
    if (cached) return cached;
    const id = this.providerId(symbol);
    const from = Math.floor(timestamp.getTime() / 1000) - 3600;
    const to = Math.floor(timestamp.getTime() / 1000) + 3600;
    const data = (await this.request(`/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`)) as { prices?: Array<[number, number]> };
    const prices = data.prices ?? [];
    if (prices.length === 0) throw new MarketDataError(`No historical prices for ${symbol} around ${timestamp.toISOString()}`);
    // Closest point at or before the timestamp, falling back to the closest overall.
    const target = timestamp.getTime();
    let best = prices[0];
    for (const p of prices) {
      if (Math.abs(p[0] - target) < Math.abs(best[0] - target)) best = p;
    }
    const price = assertValidPrice(best[1], `${symbol} historical`);
    const result: MarketPrice = { assetSymbol: symbol, price, timestamp: new Date(best[0]).toISOString(), source: this.name };
    this.historyCache.set(key, result);
    return result;
  }

  async getPriceSeries(symbol: AssetSymbol, from: Date, to: Date, points: number): Promise<PricePoint[]> {
    const key = `${symbol}:${Math.floor(from.getTime() / 600_000)}:${Math.floor(to.getTime() / 600_000)}:${points}`;
    const cached = this.seriesCache.get(key);
    if (cached) return cached;
    const id = this.providerId(symbol);
    const data = (await this.request(`/coins/${id}/market_chart/range?vs_currency=usd&from=${Math.floor(from.getTime() / 1000)}&to=${Math.floor(to.getTime() / 1000)}`)) as { prices?: Array<[number, number]> };
    const raw = (data.prices ?? []).map(([t, p]) => ({ time: new Date(t).toISOString(), price: p })).filter((p) => Number.isFinite(p.price) && p.price > 0);
    // Downsample evenly to the requested number of points.
    const step = Math.max(1, Math.floor(raw.length / points));
    const series = raw.filter((_, i) => i % step === 0);
    this.seriesCache.set(key, series);
    return series;
  }
}

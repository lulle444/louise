import { isDemoMode } from "../config";
import { CoinbaseProvider } from "./coinbase-provider";
import { CoinGeckoProvider } from "./coingecko-provider";
import { FallbackProvider } from "./fallback-provider";
import { MockMarketDataProvider } from "./mock-provider";
import type { MarketDataProvider } from "./provider";

const globalForMarket = globalThis as unknown as { __alphrProvider?: MarketDataProvider };

/**
 * Resolve the market-data provider. Demo Mode always uses the deterministic
 * simulated provider so that seeded Battles settle reproducibly. Live mode
 * falls back to Coinbase when CoinGecko is rate-limited or down.
 */
export function getMarketDataProvider(): MarketDataProvider {
  if (globalForMarket.__alphrProvider) return globalForMarket.__alphrProvider;
  const provider: MarketDataProvider = isDemoMode()
    ? new MockMarketDataProvider()
    : new FallbackProvider([new CoinGeckoProvider(process.env.MARKET_DATA_API_KEY?.trim() || undefined), new CoinbaseProvider()]);
  globalForMarket.__alphrProvider = provider;
  return provider;
}

export type { MarketDataProvider, MarketPrice, PricePoint } from "./provider";

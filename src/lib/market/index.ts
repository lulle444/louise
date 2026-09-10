import { isDemoMode } from "../config";
import { CoinGeckoProvider } from "./coingecko-provider";
import { MockMarketDataProvider } from "./mock-provider";
import type { MarketDataProvider } from "./provider";

const globalForMarket = globalThis as unknown as { __callscoreProvider?: MarketDataProvider };

/**
 * Resolve the market-data provider. Demo Mode always uses the deterministic
 * simulated provider so that seeded Battles settle reproducibly.
 */
export function getMarketDataProvider(): MarketDataProvider {
  if (globalForMarket.__callscoreProvider) return globalForMarket.__callscoreProvider;
  const provider: MarketDataProvider = isDemoMode()
    ? new MockMarketDataProvider()
    : new CoinGeckoProvider(process.env.MARKET_DATA_API_KEY?.trim() || undefined);
  globalForMarket.__callscoreProvider = provider;
  return provider;
}

export type { MarketDataProvider, MarketPrice, PricePoint } from "./provider";

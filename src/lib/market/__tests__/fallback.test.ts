import { afterEach, describe, expect, it, vi } from "vitest";
import { CoinbaseProvider } from "../coinbase-provider";
import { FallbackProvider } from "../fallback-provider";
import { MarketDataError, type MarketDataProvider } from "../provider";

const failing: MarketDataProvider = {
  name: "down",
  isMock: false,
  getCurrentPrice: async () => {
    throw new MarketDataError("429");
  },
  getHistoricalPrice: async () => {
    throw new MarketDataError("429");
  },
  getPriceSeries: async () => [],
};

afterEach(() => vi.unstubAllGlobals());

describe("FallbackProvider", () => {
  it("uses the next provider when the first fails", async () => {
    const backup: MarketDataProvider = {
      ...failing,
      name: "backup",
      getCurrentPrice: async (s) => ({ assetSymbol: s, price: 2700, timestamp: "2026-09-29T10:00:00.000Z", source: "backup" }),
      getPriceSeries: async () => [{ time: "2026-09-29T10:00:00.000Z", price: 2700 }],
    };
    const p = new FallbackProvider([failing, backup]);
    await expect(p.getCurrentPrice("ETH")).resolves.toMatchObject({ price: 2700, source: "backup" });
    await expect(p.getPriceSeries("ETH", new Date(0), new Date(1), 10)).resolves.toHaveLength(1);
  });

  it("throws when every provider fails", async () => {
    await expect(new FallbackProvider([failing, failing]).getCurrentPrice("BTC")).rejects.toThrow(/All market data providers failed/);
  });
});

describe("CoinbaseProvider", () => {
  it("parses the spot price and candle open", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const body = url.includes("/spot")
        ? { data: { amount: "2687.50", base: "ETH", currency: "USD" } }
        : [
            [1790640300, 2680, 2690, 2685, 2688, 10],
            [1790640000, 2670, 2686, 2675, 2684, 12],
          ];
      return new Response(JSON.stringify(body), { status: 200 });
    }));
    const p = new CoinbaseProvider();
    await expect(p.getCurrentPrice("ETH")).resolves.toMatchObject({ price: 2687.5, source: "coinbase" });
    const hist = await p.getHistoricalPrice("ETH", new Date(1790640000 * 1000));
    expect(hist.price).toBe(2675);
  });
});

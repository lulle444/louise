import "server-only";
import { hasSupabaseConfig, isDemoMode } from "@/lib/config";
import { buildDemoWorld, type DemoWorld } from "@/lib/demo/world";
import { MockMarketDataProvider } from "@/lib/data/mock-provider";
import { CoinGeckoProvider } from "@/lib/data/coingecko-provider";
import type { MarketDataProvider } from "@/lib/data/provider";
import { buildCatalogue } from "@/lib/demo/catalogue";
import { makeId } from "@/lib/ids";
import type { DataStore } from "./types";

/**
 * Store resolution.
 *
 * Demo Mode keeps a single in-memory world per server process. It is rebuilt
 * when the UTC day changes so the demo Race timeline always has a live Race,
 * and live snapshots are appended lazily every six hours.
 */
type Cache = { world: DemoWorld; day: number } | null;
const globalCache = globalThis as unknown as { __metaRaceDemo?: Cache; __metaRacePending?: Promise<DemoWorld> };

export async function getDemoWorld(nowIso = new Date().toISOString()): Promise<DemoWorld> {
  const day = Math.floor(Date.parse(nowIso) / 86_400_000);
  const cached = globalCache.__metaRaceDemo;
  if (cached && cached.day === day) {
    await cached.world.advance(nowIso);
    return cached.world;
  }
  if (!globalCache.__metaRacePending) {
    globalCache.__metaRacePending = buildDemoWorld(nowIso).then((world) => {
      globalCache.__metaRaceDemo = { world, day };
      globalCache.__metaRacePending = undefined;
      return world;
    });
  }
  return globalCache.__metaRacePending;
}

export async function getBaseStore(): Promise<DataStore> {
  if (isDemoMode() || !hasSupabaseConfig()) {
    return (await getDemoWorld()).store;
  }
  const { SupabaseStore } = await import("./supabase-store");
  return new SupabaseStore();
}

export async function getProvider(): Promise<MarketDataProvider> {
  if (isDemoMode()) return (await getDemoWorld()).provider;
  const key = process.env.MARKET_DATA_API_KEY;
  if (key) return new CoinGeckoProvider(key);
  return new MockMarketDataProvider(buildCatalogue(new Date().toISOString()).mockConfigs);
}

export function newId(prefix: string): string {
  return makeId(prefix);
}

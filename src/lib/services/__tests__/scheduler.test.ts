import { describe, expect, it } from "vitest";
import { DemoRepository } from "@/lib/data/demo/repository";
import { emptyState } from "@/lib/data/demo/store";
import { MockMarketDataProvider } from "@/lib/market/mock-provider";
import { assetForDay, ensureDailyBattles, utcDayStart } from "@/lib/services/scheduler";
import { ASSETS } from "@/lib/domain/catalogue";

describe("daily Battle scheduler", () => {
  it("creates today's and tomorrow's Battles once, rotating assets", async () => {
    const repo = new DemoRepository(emptyState(new Date().toISOString()));
    const now = new Date("2026-03-10T08:00:00Z");
    const provider = new MockMarketDataProvider(() => now);
    const created = await ensureDailyBattles(repo, provider, now);
    expect(created).toHaveLength(2);
    expect(created[0].opensAt).toBe("2026-03-10T00:00:00.000Z");
    expect(created[0].locksAt).toBe("2026-03-10T20:00:00.000Z");
    expect(created[0].endsAt).toBe("2026-03-11T00:00:00.000Z");
    expect(created[0].status).toBe("open");
    expect(created[0].startPrice).not.toBeNull();
    expect(created[1].status).toBe("upcoming");
    expect(created[0].assetId).not.toBe(created[1].assetId);
    // AI forecasts locked for the open Battle.
    expect((await repo.listAIPredictions({ battleId: created[0].id })).length).toBe(3);
    // Idempotent.
    expect(await ensureDailyBattles(repo, provider, now)).toHaveLength(0);
    expect((await repo.listBattles()).length).toBe(2);
  });

  it("skips today's Battle when it would already be locked", async () => {
    const repo = new DemoRepository(emptyState(new Date().toISOString()));
    const now = new Date("2026-03-10T21:00:00Z");
    const created = await ensureDailyBattles(repo, provider(now), now);
    expect(created).toHaveLength(1);
    expect(created[0].opensAt).toBe("2026-03-11T00:00:00.000Z");
  });

  it("rotates BTC → ETH → SOL deterministically", () => {
    const day = utcDayStart(new Date("2026-03-10T00:00:00Z"));
    const syms = [0, 1, 2, 3].map((d) => assetForDay(day + d * 86_400_000, ASSETS)?.symbol);
    expect(new Set(syms.slice(0, 3)).size).toBe(3);
    expect(syms[3]).toBe(syms[0]);
  });
});

function provider(now: Date) {
  return new MockMarketDataProvider(() => now);
}

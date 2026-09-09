import { describe, expect, it } from "vitest";
import { DemoRepository } from "@/lib/data/demo/repository";
import { emptyState } from "@/lib/data/demo/store";
import { ASSETS, AI_PROFILES, SIGNALS } from "@/lib/domain/catalogue";
import type { Profile, Viewer } from "@/lib/domain/types";
import { MockMarketDataProvider, simulatedPrice } from "@/lib/market/mock-provider";
import { ensureBattleOpened } from "@/lib/services/lifecycle";
import { lockPrediction, PredictionError } from "@/lib/services/predictions";
import { settleBattle, voidBattle } from "@/lib/services/settlement";
import { aggregateCrowd } from "@/lib/domain/crowd";
import { resolveOutcome } from "@/lib/domain/settlement";


function profile(id: string): Profile {
  const now = new Date().toISOString();
  return { id, username: id, displayName: id, avatarUrl: null, bio: null, xp: 0, currentStreak: 0, longestStreak: 0, isAdmin: false, createdAt: now, updatedAt: now };
}
const viewer = (p: Profile): Viewer => ({ id: p.id, username: p.username, displayName: p.displayName, email: null, isAdmin: false, isGuest: false });

async function setup() {
  const state = emptyState(new Date().toISOString());
  const repo = new DemoRepository(state);
  let clock = new Date("2026-03-01T00:00:00Z");
  const provider = new MockMarketDataProvider(() => clock);
  const alice = repo.ensureProfile(profile("alice"));
  const bob = repo.ensureProfile(profile("bob"));
  const opensAt = "2026-03-01T00:00:00.000Z";
  const battle = await repo.createBattle({
    assetId: ASSETS[0].id, title: "BTC test", slug: "btc-test", battleType: "daily", status: "upcoming",
    opensAt, locksAt: "2026-03-01T12:00:00.000Z", endsAt: "2026-03-02T00:00:00.000Z", neutralThresholdPercent: 0.5,
    startPrice: null, startPriceAt: null, endPrice: null, endPriceAt: null, outcome: null, settlementSource: null, settlementError: null,
    aiProfileIds: AI_PROFILES.map((p) => p.id), createdBy: null,
  });
  clock = new Date("2026-03-01T00:01:00Z");
  await ensureBattleOpened(repo, provider, battle, ASSETS[0], clock);
  const outcome = resolveOutcome(simulatedPrice("BTC", Date.parse(opensAt)), simulatedPrice("BTC", Date.parse(battle.endsAt)), 0.5).outcome;
  const wrong = outcome === "bullish" ? "bearish" : "bullish";
  const sig = SIGNALS.slice(0, 3).map((s) => s.id);
  await lockPrediction(repo, provider, viewer(alice), { battleId: battle.id, direction: outcome, signalIds: sig, confidence: 4, thesis: "" }, new Date("2026-03-01T02:00:00Z"));
  await lockPrediction(repo, provider, viewer(bob), { battleId: battle.id, direction: wrong, signalIds: sig, confidence: 2, thesis: "" }, new Date("2026-03-01T03:00:00Z"));
  return { repo, provider, battle, alice, bob, outcome, sig, setClock: (d: Date) => { clock = d; } };
}

describe("settlement service", () => {
  it("settles once, awards XP through the ledger, and is idempotent on replay", async () => {
    const { repo, provider, battle, alice, bob } = await setup();
    const now = new Date("2026-03-02T00:05:00Z");
    expect((await settleBattle(repo, provider, battle.id, { source: "test", actorId: null, now: new Date("2026-03-01T23:00:00Z") })).status).toBe("not-ready");

    const first = await settleBattle(repo, provider, battle.id, { source: "test", actorId: null, now });
    expect(first.status).toBe("settled");
    const a1 = (await repo.getProfileById(alice.id))!;
    const b1 = (await repo.getProfileById(bob.id))!;
    expect(a1.xp).toBe(110); // 10 lock + 100 correct
    expect(a1.currentStreak).toBe(1);
    expect(b1.xp).toBe(10);
    expect(b1.currentStreak).toBe(0);

    const second = await settleBattle(repo, provider, battle.id, { source: "test", actorId: null, now });
    expect(second.status).toBe("already-settled");
    expect((await repo.getProfileById(alice.id))!.xp).toBe(110);
    expect((await repo.listXpLedger(alice.id)).filter((e) => e.reason === "correct")).toHaveLength(1);

    const preds = await repo.listPredictions({ battleId: battle.id });
    expect(preds.find((p) => p.userId === alice.id)?.result).toBe("correct");
    expect(preds.find((p) => p.userId === bob.id)?.result).toBe("incorrect");
    const ai = await repo.listAIPredictions({ battleId: battle.id });
    expect(ai).toHaveLength(3);
    expect(ai.every((p) => p.result === "correct" || p.result === "incorrect")).toBe(true);
    expect(ai.every((p) => Date.parse(p.lockedAt) < Date.parse(battle.locksAt))).toBe(true);
  });

  it("rejects predictions after the lock deadline and duplicate entries", async () => {
    const { repo, provider, battle, alice, sig } = await setup();
    await expect(lockPrediction(repo, provider, viewer(alice), { battleId: battle.id, direction: "bullish", signalIds: sig, confidence: 3, thesis: "" }, new Date("2026-03-01T04:00:00Z"))).rejects.toThrow(/already locked/);
    const carol = repo.ensureProfile(profile("carol"));
    await expect(lockPrediction(repo, provider, viewer(carol), { battleId: battle.id, direction: "bullish", signalIds: sig, confidence: 3, thesis: "" }, new Date("2026-03-01T12:00:00Z"))).rejects.toBeInstanceOf(PredictionError);
    await expect(lockPrediction(repo, provider, viewer(carol), { battleId: battle.id, direction: "bullish", signalIds: sig.slice(0, 2), confidence: 3, thesis: "" }, new Date("2026-03-01T05:00:00Z"))).rejects.toThrow(/exactly 3/);
  });

  it("voids a Battle without awarding score or XP and excludes it from accuracy", async () => {
    const { repo, battle, alice } = await setup();
    const voided = await voidBattle(repo, battle.id, { actorId: null, reason: "provider outage" });
    expect(voided.status).toBe("void");
    const preds = await repo.listPredictions({ battleId: battle.id });
    expect(preds.every((p) => p.result === "void" && p.battleScore === null)).toBe(true);
    expect((await repo.getProfileById(alice.id))!.xp).toBe(10);
  });

  it("crowd signal counts humans only", async () => {
    const { repo, battle } = await setup();
    const humans = await repo.listPredictions({ battleId: battle.id });
    const crowd = aggregateCrowd(humans);
    expect(crowd.total).toBe(2);
    expect((await repo.listAIPredictions({ battleId: battle.id })).length).toBe(3);
  });
});

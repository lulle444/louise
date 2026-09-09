import { describe, expect, it } from "vitest";
import { ASSETS, SIGNALS } from "../catalogue";
import { computeSignalDNA } from "../dna";
import type { Battle, Prediction } from "../types";

function battle(id: string, assetId: string): Battle {
  return {
    id, assetId, title: id, slug: id, battleType: "daily", status: "settled",
    opensAt: "2026-01-01T00:00:00Z", locksAt: "2026-01-01T14:00:00Z", endsAt: "2026-01-02T00:00:00Z",
    neutralThresholdPercent: 0.5, startPrice: 1, startPriceAt: null, endPrice: 1, endPriceAt: null,
    outcome: "bullish", settlementSource: null, settlementError: null, aiProfileIds: [], createdBy: null,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  };
}

function prediction(id: string, battleId: string, result: Prediction["result"], signalIds: string[]): Prediction {
  return { id, battleId, userId: "u", direction: "bullish", signalIds, confidence: 3, thesis: null, referencePrice: 1, lockedAt: "2026-01-01T01:00:00Z", result, battleScore: result === "correct" ? 100 : 0, xpAwarded: 0, createdAt: "2026-01-01T01:00:00Z" };
}

describe("computeSignalDNA", () => {
  it("is not ready with too little history", () => {
    const dna = computeSignalDNA({ predictions: [prediction("p1", "b1", "correct", ["sig-momentum", "sig-volume", "sig-volatility"])], battles: [battle("b1", "asset-btc")], assets: ASSETS, signals: SIGNALS });
    expect(dna.ready).toBe(false);
    expect(dna.style).toBeNull();
    expect(dna.bestSignal).toBeNull();
  });

  it("computes a style and best signal once enough Battles have settled", () => {
    const battles = Array.from({ length: 6 }, (_, i) => battle(`b${i}`, i % 2 ? "asset-btc" : "asset-eth"));
    const preds = battles.map((b, i) => prediction(`p${i}`, b.id, i === 5 ? "incorrect" : "correct", ["sig-momentum", "sig-market-trend", i % 2 ? "sig-volume" : "sig-volatility"]));
    const dna = computeSignalDNA({ predictions: preds, battles, assets: ASSETS, signals: SIGNALS });
    expect(dna.ready).toBe(true);
    expect(dna.validSettled).toBe(6);
    expect(dna.mostUsedSignal?.slug).toBe("market-trend");
    expect(dna.bestSignal).not.toBeNull();
    expect(dna.style).not.toBeNull();
    expect(dna.radar.length).toBe(SIGNALS.length);
  });
});

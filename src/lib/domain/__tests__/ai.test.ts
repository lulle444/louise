import { describe, expect, it } from "vitest";
import { AI_PROFILES, SIGNALS } from "../catalogue";
import { inputsFromSeries, runStrategy } from "../ai-strategies";

describe("AI strategies", () => {
  const prices = [100, 101, 102, 101.5, 103, 104, 105, 106.5, 107];
  const inputs = inputsFromSeries({ symbol: "BTC", battleId: "b-1", prices, neutralThresholdPercent: 0.5 });

  it("produces the same forecast structure as a human prediction and is deterministic", () => {
    for (const profile of AI_PROFILES) {
      const a = runStrategy(profile, inputs, SIGNALS);
      const b = runStrategy(profile, inputs, SIGNALS);
      expect(a).toEqual(b);
      expect(a.signalIds).toHaveLength(3);
      expect(new Set(a.signalIds).size).toBe(3);
      expect(a.confidence).toBeGreaterThanOrEqual(1);
      expect(a.confidence).toBeLessThanOrEqual(5);
      expect(["bullish", "neutral", "bearish"]).toContain(a.direction);
      expect(a.inputSnapshot).not.toHaveProperty("endPrice");
    }
  });

  it("follows an obvious uptrend for trend/momentum profiles", () => {
    const oracle = runStrategy(AI_PROFILES[0], inputs, SIGNALS);
    const vector = runStrategy(AI_PROFILES[1], inputs, SIGNALS);
    expect(oracle.direction).toBe("bullish");
    expect(vector.direction).toBe("bullish");
  });
});

import { describe, expect, it } from "vitest";
import {
  NARRATIVE_WEIGHTS,
  narrativeScore,
  normalizeComponents,
  normalizeLinear,
  rankScores,
  scoreFromRaw,
  isValidRaw,
} from "@/lib/scoring/narrative-score";

describe("narrative score", () => {
  it("weights sum to 1", () => {
    const sum = Object.values(NARRATIVE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  it("applies the published formula", () => {
    const score = narrativeScore({ price: 80, breadth: 60, volume: 40, momentum: 100 });
    expect(score).toBeCloseTo(80 * 0.4 + 60 * 0.25 + 40 * 0.2 + 100 * 0.15, 2);
  });

  it("clamps normalization at the documented bounds", () => {
    expect(normalizeLinear(-100, -25, 25)).toBe(0);
    expect(normalizeLinear(0, -25, 25)).toBe(50);
    expect(normalizeLinear(25, -25, 25)).toBe(100);
    expect(normalizeLinear(500, -25, 25)).toBe(100);
    expect(normalizeLinear(Number.NaN, -25, 25)).toBe(0);
  });

  it("normalizes breadth and momentum from shares", () => {
    const c = normalizeComponents({ priceChangePct: 0, breadthShare: 0.6, volumeChangePct: 25, momentumConsistency: 1.4 });
    expect(c.breadth).toBe(60);
    expect(c.momentum).toBe(100);
    expect(c.volume).toBe(50);
  });

  it("keeps scores within 0-100", () => {
    expect(scoreFromRaw({ priceChangePct: 1000, breadthShare: 5, volumeChangePct: 1e6, momentumConsistency: 9 }).score).toBe(100);
    expect(scoreFromRaw({ priceChangePct: -1000, breadthShare: -5, volumeChangePct: -1e6, momentumConsistency: -9 }).score).toBe(0);
  });

  it("ranks deterministically with ties broken by id", () => {
    const ranked = rankScores([
      { narrativeId: "b", score: 50 },
      { narrativeId: "a", score: 50 },
      { narrativeId: "c", score: 70 },
    ]);
    expect(ranked.map((r) => r.narrativeId)).toEqual(["c", "a", "b"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("rejects non-finite inputs instead of fabricating data", () => {
    expect(isValidRaw({ priceChangePct: Infinity, breadthShare: 0.5, volumeChangePct: 0, momentumConsistency: 0.5 })).toBe(false);
    expect(isValidRaw({ priceChangePct: NaN, breadthShare: 0.5, volumeChangePct: 0, momentumConsistency: 0.5 })).toBe(false);
  });
});

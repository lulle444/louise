import { describe, expect, it } from "vitest";
import { aggregateCrowd, canRevealCrowd } from "../crowd";

describe("aggregateCrowd", () => {
  it("computes percentages from human calls only", () => {
    const humans = [
      { direction: "bullish" as const },
      { direction: "bullish" as const },
      { direction: "bearish" as const },
      { direction: "neutral" as const },
    ];
    const ai = [{ direction: "bearish" as const }, { direction: "bearish" as const }];
    const crowd = aggregateCrowd(humans);
    expect(crowd.total).toBe(4);
    expect(crowd.percentages).toEqual({ bullish: 50, neutral: 25, bearish: 25 });
    expect(crowd.majority).toBe("bullish");
    // Passing AI predictions would change the result — callers must not.
    expect(aggregateCrowd([...humans, ...ai]).majority).toBe("bearish");
  });

  it("handles an empty crowd", () => {
    const crowd = aggregateCrowd([]);
    expect(crowd.total).toBe(0);
    expect(crowd.majority).toBeNull();
  });
});

describe("canRevealCrowd", () => {
  it("hides the crowd until the viewer locks or the Round closes", () => {
    expect(canRevealCrowd({ viewerHasLocked: false, battleAcceptingPredictions: true })).toBe(false);
    expect(canRevealCrowd({ viewerHasLocked: true, battleAcceptingPredictions: true })).toBe(true);
    expect(canRevealCrowd({ viewerHasLocked: false, battleAcceptingPredictions: false })).toBe(true);
  });
});

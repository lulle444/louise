import { describe, expect, it } from "vitest";
import { arenaRating, computeAccuracy, computeStreaks, levelForXp, levelProgress, settlementXpAwards, xpLedgerKey } from "../scoring";

describe("computeAccuracy", () => {
  it("excludes void and pending predictions", () => {
    const acc = computeAccuracy([
      { result: "correct" },
      { result: "incorrect" },
      { result: "correct" },
      { result: "void" },
      { result: "pending" },
    ]);
    expect(acc.valid).toBe(3);
    expect(acc.correct).toBe(2);
    expect(acc.voided).toBe(1);
    expect(acc.pending).toBe(1);
    expect(acc.accuracy).toBeCloseTo(2 / 3);
  });

  it("returns null accuracy with no valid predictions", () => {
    expect(computeAccuracy([{ result: "void" }]).accuracy).toBeNull();
    expect(computeAccuracy([]).accuracy).toBeNull();
  });
});

describe("arenaRating", () => {
  it("matches the published formula", () => {
    // 70% accuracy, 15 valid battles, streak 4
    // 70*0.6 = 42, (15/30)*25 = 12.5, (4/10)*15 = 6 => 60.5
    expect(arenaRating(0.7, 15, 4)).toBe(60.5);
  });

  it("caps experience and consistency components", () => {
    expect(arenaRating(1, 300, 50)).toBe(100);
  });

  it("gives a small sample a lower rating than a large one at the same accuracy", () => {
    expect(arenaRating(0.8, 2, 2)).toBeLessThan(arenaRating(0.8, 30, 2));
  });

  it("treats missing accuracy as zero", () => {
    expect(arenaRating(null, 0, 0)).toBe(0);
  });
});

describe("computeStreaks", () => {
  it("ignores void results and resets on incorrect", () => {
    const s = computeStreaks(["correct", "correct", "void", "correct", "incorrect", "correct", "correct"]);
    expect(s.current).toBe(2);
    expect(s.longest).toBe(3);
  });
});

describe("levels", () => {
  it("maps XP to seeded levels", () => {
    expect(levelForXp(0).name).toBe("Observer");
    expect(levelForXp(249).name).toBe("Observer");
    expect(levelForXp(250).name).toBe("Scout");
    expect(levelForXp(6000).name).toBe("Oracle");
    expect(levelProgress(500).progress).toBeCloseTo(0.5);
    expect(levelProgress(9000).next).toBeNull();
  });
});

describe("settlementXpAwards", () => {
  it("awards correct + streak bonuses once at the streak thresholds", () => {
    expect(settlementXpAwards({ result: "correct", streakAfter: 3, validSettledAfter: 3, hasSevenBattleBonus: false }))
      .toEqual([{ reason: "correct", amount: 100 }, { reason: "streak_3", amount: 25 }]);
    expect(settlementXpAwards({ result: "correct", streakAfter: 4, validSettledAfter: 4, hasSevenBattleBonus: false }))
      .toEqual([{ reason: "correct", amount: 100 }]);
    expect(settlementXpAwards({ result: "correct", streakAfter: 5, validSettledAfter: 5, hasSevenBattleBonus: false }))
      .toEqual([{ reason: "correct", amount: 100 }, { reason: "streak_5", amount: 50 }]);
  });

  it("awards the seven-battle bonus once regardless of correctness", () => {
    expect(settlementXpAwards({ result: "incorrect", streakAfter: 0, validSettledAfter: 7, hasSevenBattleBonus: false }))
      .toEqual([{ reason: "seven_battles", amount: 50 }]);
    expect(settlementXpAwards({ result: "incorrect", streakAfter: 0, validSettledAfter: 7, hasSevenBattleBonus: true }))
      .toEqual([]);
  });

  it("awards nothing for void", () => {
    expect(settlementXpAwards({ result: "void", streakAfter: 2, validSettledAfter: 7, hasSevenBattleBonus: false })).toEqual([]);
  });

  it("produces a stable idempotency key", () => {
    expect(xpLedgerKey("u1", "b1", "correct")).toBe("u1:b1:correct");
  });
});

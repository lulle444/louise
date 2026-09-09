import { describe, expect, it } from "vitest";
import { canSettle, effectiveStatus, isAcceptingPredictions, percentageChange, resolveOutcome, scorePrediction } from "../settlement";

describe("resolveOutcome", () => {
  it("settles bullish when the move exceeds the threshold", () => {
    const r = resolveOutcome(100, 101, 0.5);
    expect(r.outcome).toBe("bullish");
    expect(r.change).toBeCloseTo(1, 6);
  });

  it("settles bearish when the move is below the negative threshold", () => {
    const r = resolveOutcome(100, 98.5, 0.5);
    expect(r.outcome).toBe("bearish");
    expect(r.change).toBeCloseTo(-1.5, 6);
  });

  it("settles neutral at both threshold boundaries (inclusive)", () => {
    expect(resolveOutcome(100, 100.5, 0.5).outcome).toBe("neutral");
    expect(resolveOutcome(100, 99.5, 0.5).outcome).toBe("neutral");
  });

  it("settles neutral just inside the band and directional just outside", () => {
    expect(resolveOutcome(100, 100.49, 0.5).outcome).toBe("neutral");
    expect(resolveOutcome(100, 100.51, 0.5).outcome).toBe("bullish");
    expect(resolveOutcome(100, 99.49, 0.5).outcome).toBe("bearish");
  });

  it("handles floating-point noise at exact boundaries", () => {
    // 64250 * 1.005 is not exactly representable; must still be neutral.
    expect(resolveOutcome(64250, 64250 * 1.005, 0.5).outcome).toBe("neutral");
    expect(resolveOutcome(3180, 3180 * 0.995, 0.5).outcome).toBe("neutral");
  });

  it("rejects invalid prices", () => {
    expect(() => percentageChange(0, 100)).toThrow();
    expect(() => percentageChange(100, Number.NaN)).toThrow();
    expect(() => percentageChange(100, -5)).toThrow();
  });
});

describe("scorePrediction", () => {
  it("awards 100 for a correct direction and 0 otherwise", () => {
    expect(scorePrediction("bullish", "bullish", false)).toEqual({ result: "correct", battleScore: 100 });
    expect(scorePrediction("bearish", "bullish", false)).toEqual({ result: "incorrect", battleScore: 0 });
  });

  it("voids predictions when the Battle is void", () => {
    expect(scorePrediction("bullish", "bullish", true)).toEqual({ result: "void", battleScore: null });
    expect(scorePrediction("bullish", null, false)).toEqual({ result: "void", battleScore: null });
  });
});

describe("effectiveStatus / deadlines", () => {
  const battle = {
    status: "open" as const,
    opensAt: "2026-01-01T00:00:00.000Z",
    locksAt: "2026-01-01T14:00:00.000Z",
    endsAt: "2026-01-02T00:00:00.000Z",
  };

  it("derives upcoming/open/locked from the clock", () => {
    expect(effectiveStatus(battle, new Date("2025-12-31T23:59:59Z"))).toBe("upcoming");
    expect(effectiveStatus(battle, new Date("2026-01-01T00:00:00Z"))).toBe("open");
    expect(effectiveStatus(battle, new Date("2026-01-01T13:59:59Z"))).toBe("open");
    expect(effectiveStatus(battle, new Date("2026-01-01T14:00:00Z"))).toBe("locked");
  });

  it("does not accept predictions at or after locksAt", () => {
    expect(isAcceptingPredictions(battle, new Date("2026-01-01T13:59:59Z"))).toBe(true);
    expect(isAcceptingPredictions(battle, new Date("2026-01-01T14:00:00Z"))).toBe(false);
  });

  it("keeps terminal stored statuses", () => {
    expect(effectiveStatus({ ...battle, status: "settled" }, new Date("2026-01-01T01:00:00Z"))).toBe("settled");
    expect(effectiveStatus({ ...battle, status: "void" }, new Date("2026-01-01T01:00:00Z"))).toBe("void");
    expect(effectiveStatus({ ...battle, status: "draft" }, new Date("2026-01-01T01:00:00Z"))).toBe("draft");
  });

  it("only allows settlement after endsAt", () => {
    expect(canSettle(battle, new Date("2026-01-01T23:59:59Z"))).toBe(false);
    expect(canSettle(battle, new Date("2026-01-02T00:00:00Z"))).toBe(true);
    expect(canSettle({ ...battle, status: "settled" }, new Date("2026-01-03T00:00:00Z"))).toBe(false);
  });
});

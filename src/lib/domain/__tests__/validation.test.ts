import { describe, expect, it } from "vitest";
import { battleCreateSchema, predictionInputSchema, validatePredictionDeadline } from "../validation";

const base = { battleId: "b1", direction: "bullish", signalIds: ["a", "b", "c"], confidence: 3, thesis: "" };

describe("predictionInputSchema", () => {
  it("accepts exactly three unique signals", () => {
    const r = predictionInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.thesis).toBeNull();
  });

  it("rejects two or four signals and duplicates", () => {
    expect(predictionInputSchema.safeParse({ ...base, signalIds: ["a", "b"] }).success).toBe(false);
    expect(predictionInputSchema.safeParse({ ...base, signalIds: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(predictionInputSchema.safeParse({ ...base, signalIds: ["a", "a", "b"] }).success).toBe(false);
  });

  it("requires an integer confidence from 1 to 5", () => {
    expect(predictionInputSchema.safeParse({ ...base, confidence: 0 }).success).toBe(false);
    expect(predictionInputSchema.safeParse({ ...base, confidence: 6 }).success).toBe(false);
    expect(predictionInputSchema.safeParse({ ...base, confidence: 2.5 }).success).toBe(false);
  });

  it("limits the thesis to 240 characters", () => {
    expect(predictionInputSchema.safeParse({ ...base, thesis: "x".repeat(240) }).success).toBe(true);
    expect(predictionInputSchema.safeParse({ ...base, thesis: "x".repeat(241) }).success).toBe(false);
  });

  it("rejects unknown directions", () => {
    expect(predictionInputSchema.safeParse({ ...base, direction: "moon" }).success).toBe(false);
  });
});

describe("validatePredictionDeadline", () => {
  const w = { opensAt: "2026-01-01T00:00:00Z", locksAt: "2026-01-01T14:00:00Z" };
  it("rejects before open and at/after lock", () => {
    expect(validatePredictionDeadline({ ...w, now: new Date("2025-12-31T23:00:00Z") }).ok).toBe(false);
    expect(validatePredictionDeadline({ ...w, now: new Date("2026-01-01T14:00:00Z") }).ok).toBe(false);
    expect(validatePredictionDeadline({ ...w, now: new Date("2026-01-01T13:59:59Z") }).ok).toBe(true);
  });
});

describe("battleCreateSchema", () => {
  it("requires chronological timestamps", () => {
    const ok = battleCreateSchema.safeParse({ assetId: "a", opensAt: "2026-01-01T00:00:00Z", locksAt: "2026-01-01T14:00:00Z", endsAt: "2026-01-02T00:00:00Z" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.neutralThresholdPercent).toBe(0.5);
    const bad = battleCreateSchema.safeParse({ assetId: "a", opensAt: "2026-01-01T15:00:00Z", locksAt: "2026-01-01T14:00:00Z", endsAt: "2026-01-02T00:00:00Z" });
    expect(bad.success).toBe(false);
  });
});

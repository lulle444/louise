import { describe, expect, it } from "vitest";
import { isBeforeDeadline, lineupInputSchema, validatePicks } from "@/lib/scoring/validation";
import type { LineupPick } from "@/lib/types";

const good: LineupPick[] = [
  { role: "leader", narrativeId: "nar_ai", energy: 50 },
  { role: "challenger", narrativeId: "nar_rwa", energy: 30 },
  { role: "wildcard", narrativeId: "nar_gaming", energy: 20 },
];

describe("lineup validation", () => {
  it("accepts three unique roles with exactly 100 Energy", () => {
    expect(validatePicks(good)).toEqual([]);
    expect(lineupInputSchema.safeParse({ raceId: "r1", picks: good }).success).toBe(true);
  });

  it("rejects duplicate narratives", () => {
    const picks = [...good];
    picks[1] = { ...picks[1], narrativeId: "nar_ai" };
    expect(validatePicks(picks).some((e) => /different narratives/.test(e))).toBe(true);
  });

  it("rejects duplicate roles", () => {
    const picks: LineupPick[] = [good[0], { ...good[1], role: "leader" }, good[2]];
    expect(validatePicks(picks).some((e) => /Missing challenger|only once/.test(e))).toBe(true);
  });

  it("rejects Energy totals other than 100", () => {
    const picks = [...good];
    picks[2] = { ...picks[2], energy: 25 };
    expect(validatePicks(picks).some((e) => /exactly 100/.test(e))).toBe(true);
  });

  it("rejects negative and fractional Energy", () => {
    const neg: LineupPick[] = [{ ...good[0], energy: 120 }, { ...good[1], energy: -20 }, good[2]];
    expect(validatePicks(neg).some((e) => /non-negative integers/.test(e))).toBe(true);
    const frac: LineupPick[] = [{ ...good[0], energy: 50.5 }, { ...good[1], energy: 29.5 }, good[2]];
    expect(validatePicks(frac).some((e) => /non-negative integers/.test(e))).toBe(true);
  });

  it("allows zero Energy on a pick", () => {
    const picks: LineupPick[] = [{ ...good[0], energy: 100 }, { ...good[1], energy: 0 }, { ...good[2], energy: 0 }];
    expect(validatePicks(picks)).toEqual([]);
  });

  it("enforces the 240 character thesis limit", () => {
    expect(lineupInputSchema.safeParse({ raceId: "r1", picks: good, thesis: "x".repeat(241) }).success).toBe(false);
    expect(lineupInputSchema.safeParse({ raceId: "r1", picks: good, thesis: "x".repeat(240) }).success).toBe(true);
  });

  it("validates the deadline strictly", () => {
    expect(isBeforeDeadline("2026-01-01T09:59:59Z", "2026-01-01T10:00:00Z")).toBe(true);
    expect(isBeforeDeadline("2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z")).toBe(false);
    expect(isBeforeDeadline("2026-01-01T10:00:01Z", "2026-01-01T10:00:00Z")).toBe(false);
    expect(isBeforeDeadline("not a date", "2026-01-01T10:00:00Z")).toBe(false);
  });
});

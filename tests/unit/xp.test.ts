import { describe, expect, it } from "vitest";
import { applyAwards, lockXp, totalXp, xpForSettlement } from "@/lib/scoring/xp";
import { levelForXp } from "@/lib/scoring/levels";
import type { RaceScoreBreakdown } from "@/lib/scoring/race-score";
import type { XpEntry } from "@/lib/types";

const hit: RaceScoreBreakdown = {
  raceScore: 200,
  leaderPoints: 100,
  challengerPoints: 60,
  wildcardPoints: 40,
  leaderFinish: 1,
  challengerFinish: 2,
  wildcardFinish: 3,
  wildcardStart: 6,
  leaderHit: true,
  challengerHit: true,
  wildcardHit: true,
  bestRole: "leader",
  formulaVersion: "rs-v1",
};

describe("XP", () => {
  it("awards per-rule XP", () => {
    const awards = xpForSettlement("u1", "r1", hit, { priorParticipationStreak: 0, priorLeaderStreak: 0 });
    expect(awards.map((a) => a.reason)).toEqual(["leader_correct", "challenger_podium", "wildcard_success"]);
    expect(awards.reduce((s, a) => s + a.amount, 0)).toBe(200);
  });

  it("awards streak bonuses on the third consecutive race", () => {
    const awards = xpForSettlement("u1", "r3", hit, { priorParticipationStreak: 2, priorLeaderStreak: 2 });
    expect(awards.map((a) => a.reason)).toContain("participation_streak");
    expect(awards.map((a) => a.reason)).toContain("leader_streak");
    const noStreak = xpForSettlement("u1", "r3", { ...hit, leaderHit: false }, { priorParticipationStreak: 1, priorLeaderStreak: 2 });
    expect(noStreak.map((a) => a.reason)).not.toContain("leader_streak");
  });

  it("is idempotent: re-applying awards never double counts", () => {
    const ledger: XpEntry[] = [];
    let i = 0;
    const mk = () => `xp${++i}`;
    const awards = xpForSettlement("u1", "r1", hit, { priorParticipationStreak: 0, priorLeaderStreak: 0 });
    applyAwards(ledger, "u1", "r1", [lockXp("u1", "r1"), ...awards], "2026-01-01T00:00:00Z", mk);
    const again = applyAwards(ledger, "u1", "r1", [lockXp("u1", "r1"), ...awards], "2026-01-02T00:00:00Z", mk);
    expect(again).toEqual([]);
    expect(totalXp(ledger, "u1")).toBe(210);
  });

  it("maps XP to levels", () => {
    expect(levelForXp(0).name).toBe("Observer");
    expect(levelForXp(249).name).toBe("Observer");
    expect(levelForXp(250).name).toBe("Scout");
    expect(levelForXp(750).name).toBe("Analyst");
    expect(levelForXp(1500).name).toBe("Strategist");
    expect(levelForXp(3000).name).toBe("Meta Hunter");
    expect(levelForXp(9000).name).toBe("Navigator");
    expect(levelForXp(9000).progress).toBe(1);
  });
});

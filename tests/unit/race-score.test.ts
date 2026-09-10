import { describe, expect, it } from "vitest";
import {
  MAX_RACE_SCORE,
  ROLE_CAPS,
  challengerBase,
  energyMultiplier,
  leaderBase,
  scoreLineup,
  wildcardBase,
  type FinalStanding,
} from "@/lib/scoring/race-score";
import type { LineupPick } from "@/lib/types";

const standings: FinalStanding[] = [
  { narrativeId: "ai", finishRank: 1, startRank: 2 },
  { narrativeId: "rwa", finishRank: 2, startRank: 1 },
  { narrativeId: "gaming", finishRank: 3, startRank: 8 },
  { narrativeId: "defi", finishRank: 4, startRank: 3 },
  { narrativeId: "depin", finishRank: 5, startRank: 5 },
  { narrativeId: "l2", finishRank: 6, startRank: 4 },
  { narrativeId: "privacy", finishRank: 7, startRank: 9 },
  { narrativeId: "socialfi", finishRank: 8, startRank: 6 },
  { narrativeId: "memes", finishRank: 9, startRank: 7 },
];

describe("race scoring", () => {
  it("scores Leader by finish position", () => {
    expect(leaderBase(1)).toBe(100);
    expect(leaderBase(2)).toBe(40);
    expect(leaderBase(3)).toBe(20);
    expect(leaderBase(4)).toBe(0);
  });

  it("scores Challenger for a top-3 finish", () => {
    expect(challengerBase(1)).toBe(60);
    expect(challengerBase(3)).toBe(60);
    expect(challengerBase(4)).toBe(20);
    expect(challengerBase(5)).toBe(0);
  });

  it("scores Wildcard by positions gained, capped at 80", () => {
    expect(wildcardBase(8, 3)).toBe(80);
    expect(wildcardBase(5, 3)).toBe(40);
    expect(wildcardBase(3, 3)).toBe(0);
    expect(wildcardBase(2, 5)).toBe(0);
  });

  it("scales by Energy without exceeding caps", () => {
    expect(energyMultiplier(0)).toBe(0.5);
    expect(energyMultiplier(50)).toBe(1);
    expect(energyMultiplier(100)).toBe(1.5);
    const picks: LineupPick[] = [
      { role: "leader", narrativeId: "ai", energy: 100 },
      { role: "challenger", narrativeId: "rwa", energy: 0 },
      { role: "wildcard", narrativeId: "gaming", energy: 0 },
    ];
    const b = scoreLineup(picks, standings);
    expect(b.leaderPoints).toBe(ROLE_CAPS.leader);
    expect(b.challengerPoints).toBe(30);
    expect(b.wildcardPoints).toBe(40);
    expect(b.raceScore).toBe(220);
    expect(b.raceScore).toBeLessThanOrEqual(MAX_RACE_SCORE);
  });

  it("produces a full breakdown with hit flags and best role", () => {
    const picks: LineupPick[] = [
      { role: "leader", narrativeId: "ai", energy: 50 },
      { role: "challenger", narrativeId: "defi", energy: 30 },
      { role: "wildcard", narrativeId: "privacy", energy: 20 },
    ];
    const b = scoreLineup(picks, standings);
    expect(b.leaderHit).toBe(true);
    expect(b.challengerHit).toBe(false);
    expect(b.wildcardHit).toBe(true);
    expect(b.leaderPoints).toBe(100);
    expect(b.challengerPoints).toBe(16); // 20 × 0.8
    expect(b.wildcardPoints).toBe(28); // 40 × 0.7
    expect(b.bestRole).toBe("leader");
    expect(b.raceScore).toBe(144);
  });

  it("is deterministic (idempotent settlement)", () => {
    const picks: LineupPick[] = [
      { role: "leader", narrativeId: "rwa", energy: 34 },
      { role: "challenger", narrativeId: "ai", energy: 33 },
      { role: "wildcard", narrativeId: "memes", energy: 33 },
    ];
    expect(scoreLineup(picks, standings)).toEqual(scoreLineup(picks, standings));
  });

  it("throws on a missing role", () => {
    expect(() => scoreLineup([{ role: "leader", narrativeId: "ai", energy: 100 }], standings)).toThrow(/missing/i);
  });
});

import { describe, expect, it } from "vitest";
import { OFFICIAL_SAMPLE_THRESHOLD, computeMetaDNA, computePlayerStats, metaRating } from "@/lib/scoring/meta";
import type { RaceResult } from "@/lib/types";

function result(raceId: string, score: number, leaderHit: boolean): RaceResult {
  return {
    id: `res_${raceId}`,
    raceId,
    lineupId: `lnp_${raceId}`,
    userId: "u1",
    aiProfileId: null,
    raceScore: score,
    leaderPoints: leaderHit ? 100 : 0,
    challengerPoints: 0,
    wildcardPoints: 0,
    leaderFinish: leaderHit ? 1 : 5,
    challengerFinish: 6,
    wildcardFinish: 7,
    wildcardStart: 7,
    leaderHit,
    challengerHit: false,
    wildcardHit: false,
    bestRole: leaderHit ? "leader" : null,
    xpAwarded: 0,
    rank: 1,
    settledAt: "2026-01-01T00:00:00Z",
    formulaVersion: "rs-v1",
  };
}

describe("Meta Rating and sample threshold", () => {
  it("marks players provisional below three settled Races", () => {
    const stats = computePlayerStats([result("r1", 100, true), result("r2", 50, false)], ["r1", "r2"]);
    expect(stats.provisional).toBe(true);
    expect(stats.settledRaces).toBe(2);
    const official = computePlayerStats([result("r1", 100, true), result("r2", 50, false), result("r3", 80, true)], ["r1", "r2", "r3"]);
    expect(official.provisional).toBe(false);
    expect(OFFICIAL_SAMPLE_THRESHOLD).toBe(3);
  });

  it("computes the documented Meta Rating", () => {
    expect(metaRating({ averageScore: 100, leaderAccuracy: 0.5, challengerAccuracy: 0.5, wildcardAccuracy: 0 })).toBe(400 + 150 + 75);
  });

  it("tracks participation and leader streaks", () => {
    const stats = computePlayerStats([result("r2", 100, true), result("r3", 100, true)], ["r1", "r2", "r3"]);
    expect(stats.currentStreak).toBe(2);
    expect(stats.bestLeaderStreak).toBe(2);
  });

  it("does not infer Meta DNA from tiny samples", () => {
    const dna = computeMetaDNA({ results: [result("r1", 100, true)], lineups: new Map(), crowdByRace: new Map(), narratives: [] });
    expect(dna.ready).toBe(false);
    expect(dna.label).toBeNull();
  });
});

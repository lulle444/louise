import { describe, expect, it } from "vitest";
import { aggregateCrowd } from "@/lib/scoring/crowd";
import type { Lineup } from "@/lib/types";

function lineup(id: string, kind: Lineup["kind"], l: string, c: string, w: string, e: [number, number, number]): Lineup {
  return {
    id,
    raceId: "r1",
    kind,
    userId: kind === "human" ? `u_${id}` : null,
    aiProfileId: kind === "ai" ? `ai_${id}` : null,
    thesis: null,
    createdAt: "2026-01-01T00:00:00Z",
    lockedAt: "2026-01-01T00:00:00Z",
    status: "locked",
    picks: [
      { role: "leader", narrativeId: l, energy: e[0] },
      { role: "challenger", narrativeId: c, energy: e[1] },
      { role: "wildcard", narrativeId: w, energy: e[2] },
    ],
  };
}

describe("crowd aggregation", () => {
  it("excludes AI lineups", () => {
    const crowd = aggregateCrowd([
      lineup("1", "human", "ai", "rwa", "gaming", [50, 30, 20]),
      lineup("2", "human", "ai", "defi", "gaming", [60, 20, 20]),
      lineup("3", "ai", "memes", "memes2", "memes3", [50, 30, 20]),
    ]);
    expect(crowd.sampleSize).toBe(2);
    expect(crowd.byRole.leader[0]).toMatchObject({ narrativeId: "ai", count: 2, share: 1 });
    expect(crowd.conviction.find((c) => c.narrativeId === "memes")).toBeUndefined();
  });

  it("builds a consensus lineup that totals 100 Energy with unique narratives", () => {
    const crowd = aggregateCrowd([
      lineup("1", "human", "ai", "ai", "gaming", [50, 30, 20]),
      lineup("2", "human", "ai", "rwa", "gaming", [40, 40, 20]),
      lineup("3", "human", "rwa", "ai", "defi", [70, 20, 10]),
    ]);
    expect(crowd.consensus).not.toBeNull();
    const ids = crowd.consensus!.map((p) => p.narrativeId);
    expect(new Set(ids).size).toBe(3);
    expect(crowd.consensus!.reduce((s, p) => s + p.energy, 0)).toBe(100);
    expect(crowd.consensus![0].narrativeId).toBe("ai");
  });

  it("reports the biggest disagreement as the closest split", () => {
    const crowd = aggregateCrowd([
      lineup("1", "human", "ai", "rwa", "gaming", [50, 30, 20]),
      lineup("2", "human", "ai", "defi", "gaming", [50, 30, 20]),
      lineup("3", "human", "rwa", "defi", "gaming", [50, 30, 20]),
      lineup("4", "human", "ai", "rwa", "l2", [50, 30, 20]),
    ]);
    expect(crowd.disagreement?.role).toBe("challenger");
  });

  it("returns an empty aggregate without lineups", () => {
    const crowd = aggregateCrowd([]);
    expect(crowd.sampleSize).toBe(0);
    expect(crowd.consensus).toBeNull();
    expect(crowd.disagreement).toBeNull();
  });
});

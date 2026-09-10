import { describe, expect, it } from "vitest";
import { buildAiLineup } from "@/lib/scoring/ai";
import { validatePicks } from "@/lib/scoring/validation";
import type { NarrativeSnapshot } from "@/lib/types";

function snap(id: string, rank: number, c: { price: number; breadth: number; volume: number; momentum: number }): NarrativeSnapshot {
  return {
    id: `snp_${id}`,
    raceId: "r1",
    narrativeId: id,
    kind: "prelock",
    takenAt: "2026-01-01T00:00:00Z",
    raw: { priceChangePct: 0, breadthShare: 0, volumeChangePct: 0, momentumConsistency: 0 },
    normalized: c,
    score: 100 - rank * 5,
    rank,
    source: "test",
    constituentVersionId: "v1",
    formulaVersion: "ns-v1",
    quality: "ok",
  };
}

const field = [
  snap("a", 1, { price: 90, breadth: 80, volume: 40, momentum: 50 }),
  snap("b", 2, { price: 80, breadth: 70, volume: 90, momentum: 95 }),
  snap("c", 3, { price: 70, breadth: 60, volume: 60, momentum: 60 }),
  snap("d", 4, { price: 60, breadth: 90, volume: 30, momentum: 40 }),
  snap("e", 5, { price: 50, breadth: 40, volume: 80, momentum: 85 }),
  snap("f", 6, { price: 40, breadth: 95, volume: 20, momentum: 30 }),
  snap("g", 7, { price: 30, breadth: 30, volume: 10, momentum: 20 }),
];

describe("AI coaches", () => {
  it("every coach obeys the lineup rules", () => {
    for (const code of ["ROTATOR", "ATLAS", "NOVA"] as const) {
      const picks = buildAiLineup(code, field, field.map((s) => ({ ...s, score: s.score - 3 })));
      expect(validatePicks(picks)).toEqual([]);
    }
  });

  it("ROTATOR follows momentum and volume", () => {
    const picks = buildAiLineup("ROTATOR", field, null);
    expect(picks.find((p) => p.role === "leader")?.narrativeId).toBe("b");
    expect(picks.find((p) => p.role === "wildcard")?.narrativeId).toBe("e");
  });

  it("ATLAS balances price and breadth", () => {
    const picks = buildAiLineup("ATLAS", field, null);
    expect(picks.find((p) => p.role === "leader")?.narrativeId).toBe("a");
    expect(picks.find((p) => p.role === "wildcard")?.narrativeId).toBe("f");
  });

  it("NOVA drafts the most improved narratives", () => {
    const previous = field.map((s) => ({ ...s, score: s.narrativeId === "g" ? 10 : s.score + 10 }));
    const picks = buildAiLineup("NOVA", field, previous);
    expect(picks.find((p) => p.role === "leader")?.narrativeId).toBe("g");
  });

  it("is deterministic", () => {
    expect(buildAiLineup("ROTATOR", field, null)).toEqual(buildAiLineup("ROTATOR", field, null));
  });
});

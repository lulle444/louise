import { describe, expect, it } from "vitest";
import {
  CURRENT_FORMULA_VERSION,
  FORMULA_V0_9,
  FORMULA_V1,
  computeDelivery,
  computeShipScore,
  deliveryRates,
  getFormula,
  milestoneCredit,
  scoreBand,
} from "@/lib/domain/score";
import { NOW, makeChecks, makeEvidence, makeMilestone, makeSnapshot, project } from "./fixtures";

const fullInputs = () => ({
  project,
  milestones: [
    makeMilestone({ id: "m1", status: "shipped", deliveredAt: "2026-06-01T00:00:00Z" }),
    makeMilestone({ id: "m2", status: "shipped", deliveredAt: "2026-07-15T00:00:00Z" }),
    makeMilestone({ id: "m3", status: "partially_shipped" }),
    makeMilestone({ id: "m4", status: "no_evidence" }),
  ],
  evidence: [makeEvidence()],
  githubSnapshots: [makeSnapshot()],
  websiteChecks: makeChecks(10),
  now: NOW,
});

describe("Ship Score formula and weights", () => {
  it("weights sum to 1 and match the published formula", () => {
    const w = FORMULA_V1.weights;
    expect(w.delivery).toBe(0.4);
    expect(w.development).toBe(0.2);
    expect(w.availability).toBe(0.15);
    expect(w.transparency).toBe(0.15);
    expect(w.evidence).toBe(0.1);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("computes the total as the weighted sum of components", () => {
    const snap = computeShipScore(fullInputs());
    expect(snap.insufficientData).toBe(false);
    const c = snap.components;
    const expected = Math.round(
      c.delivery! * 0.4 + c.development! * 0.2 + c.availability! * 0.15 + c.transparency! * 0.15 + c.evidence! * 0.1,
    );
    expect(snap.total).toBe(expected);
    expect(snap.dataCompleteness).toBe(1);
    expect(snap.formulaVersion).toBe(CURRENT_FORMULA_VERSION);
    expect(snap.explanation.join("\n")).toContain(`Total = ${expected}`);
  });

  it("renormalises over available weight when a component is missing", () => {
    const inputs = { ...fullInputs(), websiteChecks: [] };
    const snap = computeShipScore(inputs);
    expect(snap.components.availability).toBeNull();
    expect(snap.dataCompleteness).toBe(0.85);
    expect(snap.insufficientData).toBe(false);
    const c = snap.components;
    const expected = Math.round((c.delivery! * 0.4 + c.development! * 0.2 + c.transparency! * 0.15 + c.evidence! * 0.1) / 0.85);
    expect(snap.total).toBe(expected);
    expect(snap.insufficientReasons).toContain("No website health checks recorded.");
  });
});

describe("Insufficient-data threshold", () => {
  it("returns no total with fewer than three counted past-deadline milestones", () => {
    const inputs = { ...fullInputs(), milestones: [makeMilestone({ id: "a" }), makeMilestone({ id: "b" })] };
    const snap = computeShipScore(inputs);
    expect(snap.insufficientData).toBe(true);
    expect(snap.total).toBeNull();
    expect(snap.components.delivery).toBeNull();
    expect(snap.insufficientReasons[0]).toMatch(/Fewer than 3/);
  });

  it("ignores milestones whose deadline has not passed and unapproved milestones", () => {
    const milestones = [
      makeMilestone({ id: "a" }),
      makeMilestone({ id: "b" }),
      makeMilestone({ id: "future", deadline: "2027-01-01" }),
      makeMilestone({ id: "unapproved", moderatorApproved: false }),
    ];
    const result = computeDelivery(milestones, FORMULA_V1, NOW);
    expect(result.counted).toBe(2);
    expect(result.score).toBeNull();
  });

  it("flags insufficient data when weight coverage is below the minimum", () => {
    const inputs = { ...fullInputs(), githubSnapshots: [], websiteChecks: [], evidence: [] };
    const snap = computeShipScore(inputs);
    expect(snap.dataCompleteness).toBe(0.55);
    expect(snap.insufficientData).toBe(true);
    expect(snap.total).toBeNull();
  });
});

describe("On-time / late / partial credit", () => {
  it("credits shipped on time 100, late 70, partial 40, delayed-with-explanation 25, no evidence 0", () => {
    expect(milestoneCredit(makeMilestone({ deliveredAt: "2026-06-30T00:00:00Z" }), FORMULA_V1).credit).toBe(100);
    expect(milestoneCredit(makeMilestone({ deliveredAt: "2026-07-01T00:00:00Z" }), FORMULA_V1).credit).toBe(70);
    expect(milestoneCredit(makeMilestone({ status: "partially_shipped" }), FORMULA_V1).credit).toBe(40);
    expect(milestoneCredit(makeMilestone({ status: "delayed", hasUpdatedExplanation: true }), FORMULA_V1).credit).toBe(25);
    expect(milestoneCredit(makeMilestone({ status: "delayed", hasUpdatedExplanation: false }), FORMULA_V1).credit).toBe(0);
    expect(milestoneCredit(makeMilestone({ status: "no_evidence" }), FORMULA_V1).credit).toBe(0);
  });

  it("weights milestones by importance tier", () => {
    const milestones = [
      makeMilestone({ id: "core", importance: "core", status: "shipped", deliveredAt: "2026-06-01T00:00:00Z" }),
      makeMilestone({ id: "minor1", importance: "minor", status: "no_evidence" }),
      makeMilestone({ id: "minor2", importance: "minor", status: "no_evidence" }),
    ];
    const result = computeDelivery(milestones, FORMULA_V1, NOW);
    // (100*3 + 0 + 0) / (3+1+1) = 60
    expect(result.score).toBe(60);
  });

  it("cancelled with explanation is shown separately, cancelled without explanation counts 0", () => {
    const explained = makeMilestone({ status: "cancelled", hasUpdatedExplanation: true });
    const silent = makeMilestone({ status: "cancelled", hasUpdatedExplanation: false });
    expect(milestoneCredit(explained, FORMULA_V1).credit).toBeNull();
    expect(milestoneCredit(silent, FORMULA_V1).credit).toBe(0);
    const result = computeDelivery([explained, silent, makeMilestone(), makeMilestone(), makeMilestone()], FORMULA_V1, NOW);
    expect(result.excludedCancelledExplained).toBe(1);
    expect(result.counted).toBe(4);
  });
});

describe("Disputed exclusion", () => {
  it("excludes disputed milestones from the delivery component", () => {
    const milestones = [
      makeMilestone({ id: "d", status: "disputed" }),
      makeMilestone({ id: "a" }),
      makeMilestone({ id: "b" }),
      makeMilestone({ id: "c" }),
    ];
    const result = computeDelivery(milestones, FORMULA_V1, NOW);
    expect(result.excludedDisputed).toBe(1);
    expect(result.counted).toBe(3);
    expect(result.score).toBe(100);
    expect(result.details.find((d) => d.milestoneId === "d")?.note).toMatch(/excluded from score/);
  });

  it("delivery rates also exclude disputed milestones", () => {
    const rates = deliveryRates([makeMilestone({ status: "disputed" }), makeMilestone(), makeMilestone({ status: "no_evidence" })], NOW);
    expect(rates.due).toBe(2);
    expect(rates.deliveryRate).toBe(50);
    expect(rates.onTimeRate).toBe(50);
  });
});

describe("Score versioning", () => {
  it("records the formula version in the snapshot and supports historical versions", () => {
    const inputs = {
      ...fullInputs(),
      milestones: [
        makeMilestone({ id: "core", importance: "core", status: "shipped", deliveredAt: "2026-06-01T00:00:00Z" }),
        makeMilestone({ id: "minor1", importance: "minor", status: "no_evidence" }),
        makeMilestone({ id: "minor2", importance: "minor", status: "no_evidence" }),
      ],
    };
    const current = computeShipScore(inputs);
    const legacy = computeShipScore(inputs, FORMULA_V0_9.version);
    expect(current.formulaVersion).toBe("v1.0.0");
    expect(legacy.formulaVersion).toBe("v0.9.0");
    expect(current.components.delivery).toBe(60);
    expect(legacy.components.delivery).toBe(33);
    expect(current.total).not.toBe(legacy.total);
  });

  it("rejects unknown formula versions", () => {
    expect(() => getFormula("v9.9.9")).toThrow(/Unknown formula version/);
  });
});

describe("Score bands", () => {
  it("maps totals into bands and null into insufficient", () => {
    expect(scoreBand(null)).toBe("insufficient");
    expect(scoreBand(85)).toBe("high");
    expect(scoreBand(65)).toBe("solid");
    expect(scoreBand(45)).toBe("mixed");
    expect(scoreBand(10)).toBe("low");
  });
});

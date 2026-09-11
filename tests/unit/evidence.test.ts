import { describe, expect, it } from "vitest";
import {
  EVIDENCE_RANK,
  evidenceCompleteness,
  evidenceQualityScore,
  evidenceSufficientForDelivery,
  isPrimaryEvidence,
  rankEvidence,
  strongestEvidence,
} from "@/lib/domain/evidence";
import { makeEvidence } from "./fixtures";

describe("Evidence hierarchy", () => {
  it("ranks product release above repository release above announcement above reporting above community", () => {
    expect(EVIDENCE_RANK.product_release).toBeLessThan(EVIDENCE_RANK.repository_release);
    expect(EVIDENCE_RANK.repository_release).toBeLessThan(EVIDENCE_RANK.official_announcement);
    expect(EVIDENCE_RANK.official_announcement).toBeLessThan(EVIDENCE_RANK.independent_reporting);
    expect(EVIDENCE_RANK.independent_reporting).toBeLessThan(EVIDENCE_RANK.community_observation);
  });

  it("sorts evidence strongest first", () => {
    const sorted = rankEvidence([
      makeEvidence({ id: "c", type: "community_observation" }),
      makeEvidence({ id: "p", type: "product_release" }),
      makeEvidence({ id: "r", type: "repository_release" }),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["p", "r", "c"]);
    expect(strongestEvidence(sorted)?.id).toBe("p");
    expect(strongestEvidence([])).toBeNull();
  });

  it("does not treat social/community observations alone as proof of delivery", () => {
    expect(evidenceSufficientForDelivery([makeEvidence({ type: "community_observation" })])).toBe(false);
    expect(
      evidenceSufficientForDelivery([makeEvidence({ type: "community_observation" }), makeEvidence({ type: "community_observation" })]),
    ).toBe(false);
    expect(
      evidenceSufficientForDelivery([makeEvidence({ type: "independent_reporting" }), makeEvidence({ type: "community_observation" })]),
    ).toBe(true);
    expect(evidenceSufficientForDelivery([makeEvidence({ type: "official_announcement" })])).toBe(true);
    expect(evidenceSufficientForDelivery([makeEvidence({ type: "product_release", reviewState: "pending" })])).toBe(false);
  });

  it("identifies primary evidence", () => {
    expect(isPrimaryEvidence("product_release")).toBe(true);
    expect(isPrimaryEvidence("official_announcement")).toBe(true);
    expect(isPrimaryEvidence("independent_reporting")).toBe(false);
  });

  it("scores evidence quality by hierarchy weight and completeness", () => {
    expect(evidenceQualityScore([])).toBeNull();
    const strong = evidenceQualityScore([makeEvidence({ type: "product_release" })]);
    const weak = evidenceQualityScore([makeEvidence({ type: "community_observation", publishedAt: null, summary: "short" })]);
    expect(strong).toBe(100);
    expect(weak).toBeLessThan(strong!);
    expect(evidenceCompleteness(makeEvidence())).toBe(1);
  });
});

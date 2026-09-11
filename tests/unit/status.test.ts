import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, isOpenCommitment, validateTransition } from "@/lib/domain/status";

describe("Status transition validation", () => {
  it("follows the published lifecycle", () => {
    expect(canTransition("planned", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "submitted_for_review")).toBe(true);
    expect(canTransition("submitted_for_review", "shipped")).toBe(true);
    expect(canTransition("planned", "shipped")).toBe(false);
    expect(canTransition("shipped", "planned")).toBe(false);
    expect(canTransition("shipped", "shipped")).toBe(false);
  });

  it("allows disputes on verified outcomes so corrections remain possible", () => {
    expect(canTransition("shipped", "disputed")).toBe(true);
    expect(canTransition("no_evidence", "disputed")).toBe(true);
    expect(allowedTransitions("disputed")).toContain("shipped");
    expect(allowedTransitions("disputed")).toContain("no_evidence");
  });

  it("requires a reason and evidence for delivery statuses", () => {
    expect(validateTransition({ from: "submitted_for_review", to: "shipped", reason: "short", evidenceIds: ["e1"] })).toEqual({
      ok: false,
      error: expect.stringMatching(/reason/i),
    });
    expect(
      validateTransition({ from: "submitted_for_review", to: "shipped", reason: "Verified release notes and live product.", evidenceIds: [] }),
    ).toEqual({ ok: false, error: expect.stringMatching(/evidence/i) });
    expect(
      validateTransition({ from: "submitted_for_review", to: "shipped", reason: "Verified release notes and live product.", evidenceIds: ["e1"] }),
    ).toEqual({ ok: true });
    expect(validateTransition({ from: "planned", to: "no_evidence", reason: "Deadline passed; no qualifying evidence found.", evidenceIds: [] })).toEqual({
      ok: true,
    });
  });

  it("classifies open commitments", () => {
    expect(isOpenCommitment("planned")).toBe(true);
    expect(isOpenCommitment("delayed")).toBe(true);
    expect(isOpenCommitment("shipped")).toBe(false);
  });
});

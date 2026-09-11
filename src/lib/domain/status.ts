import type { MilestoneStatus } from "./types";

/**
 * Milestone lifecycle:
 * planned → in_progress → submitted_for_review → shipped | partially_shipped | delayed | no_evidence | cancelled | disputed
 *
 * Terminal-ish states may be re-opened by moderators through `disputed` or
 * `submitted_for_review` so that corrections are possible; every transition is
 * recorded as an immutable status event.
 */
const TRANSITIONS: Record<MilestoneStatus, readonly MilestoneStatus[]> = {
  planned: ["in_progress", "submitted_for_review", "delayed", "no_evidence", "cancelled", "disputed"],
  in_progress: ["submitted_for_review", "shipped", "partially_shipped", "delayed", "no_evidence", "cancelled", "disputed"],
  submitted_for_review: ["shipped", "partially_shipped", "delayed", "no_evidence", "cancelled", "disputed", "in_progress"],
  shipped: ["disputed", "submitted_for_review"],
  partially_shipped: ["shipped", "disputed", "submitted_for_review", "delayed"],
  delayed: ["in_progress", "submitted_for_review", "shipped", "partially_shipped", "no_evidence", "cancelled", "disputed"],
  no_evidence: ["submitted_for_review", "shipped", "partially_shipped", "delayed", "cancelled", "disputed"],
  cancelled: ["disputed", "submitted_for_review"],
  disputed: ["shipped", "partially_shipped", "delayed", "no_evidence", "cancelled", "in_progress", "planned"],
};

export function allowedTransitions(from: MilestoneStatus): readonly MilestoneStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: MilestoneStatus, to: MilestoneStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export interface TransitionRequest {
  from: MilestoneStatus;
  to: MilestoneStatus;
  reason: string;
  evidenceIds: string[];
}

export type TransitionValidation = { ok: true } | { ok: false; error: string };

/** Statuses that assert delivery and therefore require at least one accepted evidence reference. */
export const EVIDENCE_REQUIRED_STATUSES: readonly MilestoneStatus[] = ["shipped", "partially_shipped"];

export function validateTransition(req: TransitionRequest): TransitionValidation {
  if (!canTransition(req.from, req.to)) {
    return { ok: false, error: `Transition ${req.from} → ${req.to} is not allowed.` };
  }
  if (req.reason.trim().length < 10) {
    return { ok: false, error: "A reason of at least 10 characters is required for every status change." };
  }
  if (EVIDENCE_REQUIRED_STATUSES.includes(req.to) && req.evidenceIds.length === 0) {
    return { ok: false, error: `Status "${req.to}" requires at least one accepted evidence reference.` };
  }
  return { ok: true };
}

export const STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  submitted_for_review: "Submitted for review",
  shipped: "Shipped",
  partially_shipped: "Partially shipped",
  delayed: "Delayed",
  no_evidence: "No evidence",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

/** Neutral, non-accusatory descriptions used across the UI. */
export const STATUS_DESCRIPTIONS: Record<MilestoneStatus, string> = {
  planned: "Publicly committed; deadline has not passed.",
  in_progress: "Project has published dated progress updates.",
  submitted_for_review: "Evidence submitted; awaiting moderator review.",
  shipped: "Verified from public evidence.",
  partially_shipped: "Part of the commitment is verified from public evidence.",
  delayed: "Deadline passed; project published an updated timeline or explanation.",
  no_evidence: "No qualifying evidence found as of the last check.",
  cancelled: "Project publicly withdrew the commitment.",
  disputed: "Status disputed; excluded from score until resolved.",
};

export function isTerminal(status: MilestoneStatus): boolean {
  return status === "shipped" || status === "cancelled";
}

export function isOpenCommitment(status: MilestoneStatus): boolean {
  return status === "planned" || status === "in_progress" || status === "submitted_for_review" || status === "delayed";
}

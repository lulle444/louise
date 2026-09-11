import type { Evidence, EvidenceType } from "./types";

/**
 * Evidence hierarchy (1 = strongest).
 * 1. Working public product/release plus official documentation
 * 2. Verifiable source repository release/tag
 * 3. Official project documentation or announcement
 * 4. Independent reputable reporting
 * 5. Community observation requiring corroboration
 */
export const EVIDENCE_RANK: Record<EvidenceType, number> = {
  product_release: 1,
  repository_release: 2,
  official_announcement: 3,
  independent_reporting: 4,
  community_observation: 5,
};

/** Quality weight (0..1) used by the evidence-quality score component. */
export const EVIDENCE_WEIGHT: Record<EvidenceType, number> = {
  product_release: 1.0,
  repository_release: 0.85,
  official_announcement: 0.65,
  independent_reporting: 0.5,
  community_observation: 0.25,
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  product_release: "Working product / release + docs",
  repository_release: "Repository release / tag",
  official_announcement: "Official documentation / announcement",
  independent_reporting: "Independent reporting",
  community_observation: "Community observation",
};

export function isPrimaryEvidence(type: EvidenceType): boolean {
  return EVIDENCE_RANK[type] <= 3;
}

export function rankEvidence<T extends { type: EvidenceType }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => EVIDENCE_RANK[a.type] - EVIDENCE_RANK[b.type]);
}

export function strongestEvidence<T extends { type: EvidenceType }>(items: readonly T[]): T | null {
  return rankEvidence(items)[0] ?? null;
}

/**
 * Whether a set of accepted evidence is sufficient to verify a "complex"
 * delivery. Social posts / community observations alone do not qualify; a
 * community observation needs corroboration by at least one other item.
 */
export function evidenceSufficientForDelivery(items: readonly Pick<Evidence, "type" | "reviewState">[]): boolean {
  const accepted = items.filter((e) => e.reviewState === "accepted");
  if (accepted.length === 0) return false;
  if (accepted.some((e) => isPrimaryEvidence(e.type))) return true;
  const independent = accepted.filter((e) => e.type === "independent_reporting").length;
  const community = accepted.filter((e) => e.type === "community_observation").length;
  // Independent reporting corroborated by another source qualifies.
  return independent >= 1 && independent + community >= 2;
}

/** Completeness of an evidence record: URL, title, summary, and dates all present. */
export function evidenceCompleteness(e: Pick<Evidence, "url" | "title" | "summary" | "publishedAt" | "accessedAt">): number {
  let score = 0;
  if (e.url) score += 0.4;
  if (e.title.trim().length >= 5) score += 0.15;
  if (e.summary.trim().length >= 20) score += 0.2;
  if (e.publishedAt) score += 0.15;
  if (e.accessedAt) score += 0.1;
  return Math.min(1, score);
}

/** 0..100 evidence quality for a set of accepted evidence. */
export function evidenceQualityScore(items: readonly Evidence[]): number | null {
  const accepted = items.filter((e) => e.reviewState === "accepted");
  if (accepted.length === 0) return null;
  const total = accepted.reduce((sum, e) => {
    const weight = EVIDENCE_WEIGHT[e.type];
    const completeness = evidenceCompleteness(e);
    return sum + weight * (0.6 + 0.4 * completeness);
  }, 0);
  return Math.round((total / accepted.length) * 100);
}

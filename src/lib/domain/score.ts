import { evidenceQualityScore } from "./evidence";
import type {
  Evidence,
  GithubSnapshot,
  ImportanceTier,
  Milestone,
  Project,
  ScoreComponents,
  ShipScoreSnapshot,
  WebsiteCheck,
} from "./types";

/**
 * Ship Score — transparent, versioned, explainable.
 *
 *   ship_score = delivery*0.40 + development*0.20 + availability*0.15 + transparency*0.15 + evidence*0.10
 *
 * The score is only produced when minimum data exists; otherwise the snapshot
 * carries `insufficientData: true` and a null total.
 */

export interface FormulaDefinition {
  version: string;
  label: string;
  weights: Record<keyof ScoreComponents, number>;
  credits: {
    shippedOnTime: number;
    shippedLate: number;
    partiallyShipped: number;
    delayedWithExplanation: number;
    delayedWithoutExplanation: number;
    noEvidence: number;
    cancelledWithoutExplanation: number;
  };
  importanceWeights: Record<ImportanceTier, number>;
  /** Minimum approved, past-deadline, non-disputed milestones needed for a delivery component. */
  minDeliveryMilestones: number;
  /** Minimum share of total weight that must be available to compute a total. */
  minWeightCoverage: number;
}

export const FORMULA_V1: FormulaDefinition = {
  version: "v1.0.0",
  label: "v1.0.0 — importance-weighted delivery (current)",
  weights: { delivery: 0.4, development: 0.2, availability: 0.15, transparency: 0.15, evidence: 0.1 },
  credits: {
    shippedOnTime: 100,
    shippedLate: 70,
    partiallyShipped: 40,
    delayedWithExplanation: 25,
    delayedWithoutExplanation: 0,
    noEvidence: 0,
    cancelledWithoutExplanation: 0,
  },
  importanceWeights: { core: 3, major: 2, minor: 1 },
  minDeliveryMilestones: 3,
  minWeightCoverage: 0.6,
};

/** Earlier formula kept for reproducibility of historical snapshots. Milestones were not importance-weighted. */
export const FORMULA_V0_9: FormulaDefinition = {
  ...FORMULA_V1,
  version: "v0.9.0",
  label: "v0.9.0 — unweighted delivery (legacy)",
  importanceWeights: { core: 1, major: 1, minor: 1 },
};

export const FORMULAS: Record<string, FormulaDefinition> = {
  [FORMULA_V1.version]: FORMULA_V1,
  [FORMULA_V0_9.version]: FORMULA_V0_9,
};

export const CURRENT_FORMULA_VERSION = FORMULA_V1.version;

export function getFormula(version: string = CURRENT_FORMULA_VERSION): FormulaDefinition {
  const formula = FORMULAS[version];
  if (!formula) throw new Error(`Unknown formula version: ${version}`);
  return formula;
}

export interface ScoreInputs {
  project: Pick<Project, "id" | "transparency">;
  milestones: readonly Milestone[];
  evidence: readonly Evidence[];
  githubSnapshots: readonly GithubSnapshot[];
  websiteChecks: readonly WebsiteCheck[];
  /** Evaluation time; defaults to now. Passing it keeps calculations deterministic. */
  now?: Date;
}

export interface DeliveryDetail {
  milestoneId: string;
  title: string;
  status: Milestone["status"];
  credit: number | null;
  weight: number;
  note: string;
}

export interface DeliveryResult {
  score: number | null;
  counted: number;
  excludedDisputed: number;
  excludedPending: number;
  excludedCancelledExplained: number;
  details: DeliveryDetail[];
}

function isPastDeadline(m: Milestone, now: Date): boolean {
  return new Date(m.deadline).getTime() < now.getTime();
}

export function milestoneCredit(m: Milestone, formula: FormulaDefinition): { credit: number | null; note: string } {
  const c = formula.credits;
  switch (m.status) {
    case "shipped": {
      const onTime = m.deliveredAt ? new Date(m.deliveredAt).getTime() <= new Date(m.deadline).getTime() : false;
      return onTime
        ? { credit: c.shippedOnTime, note: "Shipped on time" }
        : { credit: c.shippedLate, note: "Shipped after deadline" };
    }
    case "partially_shipped":
      return { credit: c.partiallyShipped, note: "Partially shipped" };
    case "delayed":
      return m.hasUpdatedExplanation
        ? { credit: c.delayedWithExplanation, note: "Delayed with updated explanation" }
        : { credit: c.delayedWithoutExplanation, note: "Delayed without updated explanation" };
    case "no_evidence":
      return { credit: c.noEvidence, note: "No qualifying evidence found" };
    case "cancelled":
      return m.hasUpdatedExplanation
        ? { credit: null, note: "Cancelled with transparent explanation — shown separately, excluded from delivery" }
        : { credit: c.cancelledWithoutExplanation, note: "Cancelled without explanation" };
    case "disputed":
      return { credit: null, note: "Status disputed; excluded from score" };
    default:
      return { credit: null, note: "Awaiting review; not yet counted" };
  }
}

export function computeDelivery(milestones: readonly Milestone[], formula: FormulaDefinition, now: Date): DeliveryResult {
  const details: DeliveryDetail[] = [];
  let weighted = 0;
  let weightSum = 0;
  let counted = 0;
  let excludedDisputed = 0;
  let excludedPending = 0;
  let excludedCancelledExplained = 0;

  for (const m of milestones) {
    if (!m.moderatorApproved) continue;
    if (!isPastDeadline(m, now)) continue;
    const weight = formula.importanceWeights[m.importance];
    const { credit, note } = milestoneCredit(m, formula);
    details.push({ milestoneId: m.id, title: m.title, status: m.status, credit, weight, note });
    if (credit === null) {
      if (m.status === "disputed") excludedDisputed += 1;
      else if (m.status === "cancelled") excludedCancelledExplained += 1;
      else excludedPending += 1;
      continue;
    }
    weighted += credit * weight;
    weightSum += weight;
    counted += 1;
  }

  const score = counted >= formula.minDeliveryMilestones && weightSum > 0 ? Math.round(weighted / weightSum) : null;
  return { score, counted, excludedDisputed, excludedPending, excludedCancelledExplained, details };
}

export function computeDevelopment(snapshots: readonly GithubSnapshot[], now: Date): number | null {
  if (snapshots.length === 0) return null;
  const latest = [...snapshots].sort((a, b) => b.retrievedAt.localeCompare(a.retrievedAt))[0]!;
  const activity = Math.min(1, latest.activeWeeksLast12 / 12);
  const releases = Math.min(1, (latest.releasesLast90d + latest.tagsLast90d) / 3);
  let recency = 0;
  if (latest.lastPushAt) {
    const days = (now.getTime() - new Date(latest.lastPushAt).getTime()) / 86_400_000;
    recency = days <= 30 ? 1 : days <= 90 ? 0.5 : days <= 180 ? 0.2 : 0;
  }
  return Math.round((activity * 0.5 + releases * 0.3 + recency * 0.2) * 100);
}

export function computeAvailability(checks: readonly WebsiteCheck[]): number | null {
  if (checks.length === 0) return null;
  const byEndpoint = new Map<string, WebsiteCheck[]>();
  for (const c of checks) {
    const list = byEndpoint.get(c.endpointId) ?? [];
    list.push(c);
    byEndpoint.set(c.endpointId, list);
  }
  let sum = 0;
  for (const list of byEndpoint.values()) {
    const recent = list.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)).slice(0, 30);
    sum += recent.filter((c) => c.ok).length / recent.length;
  }
  return Math.round((sum / byEndpoint.size) * 100);
}

export function computeTransparency(project: Pick<Project, "transparency">): number {
  const t = project.transparency;
  const roadmap = Math.min(1, t.datedRoadmapUpdates / 4);
  const value = roadmap * 0.3 + t.explanationRate * 0.3 + (t.hasPublicDocs ? 0.2 : 0) + t.changeDisclosureRate * 0.2;
  return Math.round(value * 100);
}

export function computeShipScore(inputs: ScoreInputs, version: string = CURRENT_FORMULA_VERSION): Omit<ShipScoreSnapshot, "id"> {
  const formula = getFormula(version);
  const now = inputs.now ?? new Date();
  const explanation: string[] = [];
  const insufficientReasons: string[] = [];

  const delivery = computeDelivery(inputs.milestones, formula, now);
  const components: ScoreComponents = {
    delivery: delivery.score,
    development: computeDevelopment(inputs.githubSnapshots, now),
    availability: computeAvailability(inputs.websiteChecks),
    transparency: inputs.milestones.length > 0 ? computeTransparency(inputs.project) : null,
    evidence: evidenceQualityScore(inputs.evidence),
  };

  explanation.push(
    `Formula ${formula.version}: ${(Object.keys(formula.weights) as (keyof ScoreComponents)[])
      .map((k) => `${k} × ${formula.weights[k]}`)
      .join(" + ")}.`,
  );
  explanation.push(
    `Delivery: ${delivery.counted} approved past-deadline milestone(s) counted (importance weights core ${formula.importanceWeights.core}, major ${formula.importanceWeights.major}, minor ${formula.importanceWeights.minor}); ${delivery.excludedDisputed} disputed excluded; ${delivery.excludedCancelledExplained} cancelled-with-explanation shown separately; ${delivery.excludedPending} awaiting review.`,
  );
  for (const d of delivery.details) {
    explanation.push(`• ${d.title}: ${d.note}${d.credit === null ? "" : ` → credit ${d.credit} × weight ${d.weight}`}`);
  }
  if (delivery.score === null) {
    insufficientReasons.push(`Fewer than ${formula.minDeliveryMilestones} approved milestones with passed deadlines.`);
  } else {
    explanation.push(`Delivery component = ${delivery.score}.`);
  }
  if (components.development === null) insufficientReasons.push("No repository activity snapshot available.");
  else explanation.push(`Development continuity = ${components.development} (active weeks, releases/tags in 90d, last push recency).`);
  if (components.availability === null) insufficientReasons.push("No website health checks recorded.");
  else explanation.push(`Product availability = ${components.availability} (rolling success rate across approved endpoints, last 30 checks each).`);
  if (components.transparency === null) insufficientReasons.push("No milestones recorded; transparency not evaluated.");
  else explanation.push(`Transparency = ${components.transparency} (dated roadmap updates, explanations, public docs, change disclosure).`);
  if (components.evidence === null) insufficientReasons.push("No accepted evidence.");
  else explanation.push(`Evidence quality = ${components.evidence} (hierarchy-weighted, completeness-adjusted).`);

  let availableWeight = 0;
  let weightedSum = 0;
  for (const key of Object.keys(formula.weights) as (keyof ScoreComponents)[]) {
    const value = components[key];
    if (value === null) continue;
    availableWeight += formula.weights[key];
    weightedSum += value * formula.weights[key];
  }
  const dataCompleteness = Number(availableWeight.toFixed(2));
  const insufficientData = delivery.score === null || availableWeight < formula.minWeightCoverage;

  let total: number | null = null;
  if (!insufficientData) {
    total = Math.round(weightedSum / availableWeight);
    explanation.push(
      availableWeight < 1
        ? `Total = weighted sum ÷ available weight (${availableWeight.toFixed(2)}) = ${total}. Missing components are excluded, not assumed.`
        : `Total = ${total}.`,
    );
  } else {
    explanation.push("Insufficient data: a Ship Score is not displayed until the minimum data exists.");
  }

  const confidence = Number((dataCompleteness * (0.5 + 0.5 * Math.min(1, delivery.counted / 8))).toFixed(2));

  return {
    projectId: inputs.project.id,
    total,
    components,
    confidence,
    dataCompleteness,
    formulaVersion: formula.version,
    insufficientData,
    insufficientReasons,
    calculatedAt: now.toISOString(),
    explanation,
  };
}

export type ScoreBand = "high" | "solid" | "mixed" | "low" | "insufficient";

export function scoreBand(total: number | null): ScoreBand {
  if (total === null) return "insufficient";
  if (total >= 80) return "high";
  if (total >= 60) return "solid";
  if (total >= 40) return "mixed";
  return "low";
}

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  high: "80–100 · Consistent documented delivery",
  solid: "60–79 · Mostly documented delivery",
  mixed: "40–59 · Mixed delivery record",
  low: "0–39 · Limited documented delivery",
  insufficient: "Insufficient data",
};

export function confidenceLabel(confidence: number): "High" | "Medium" | "Low" {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

/** Milestone delivery rate & on-time rate for compare tables. */
export function deliveryRates(milestones: readonly Milestone[], now: Date = new Date()) {
  const due = milestones.filter(
    (m) =>
      m.moderatorApproved &&
      isPastDeadline(m, now) &&
      m.status !== "disputed" &&
      !(m.status === "cancelled" && m.hasUpdatedExplanation),
  );
  const delivered = due.filter((m) => m.status === "shipped" || m.status === "partially_shipped");
  const onTime = due.filter(
    (m) => m.status === "shipped" && m.deliveredAt && new Date(m.deliveredAt).getTime() <= new Date(m.deadline).getTime(),
  );
  return {
    due: due.length,
    delivered: delivered.length,
    deliveryRate: due.length ? Math.round((delivered.length / due.length) * 100) : null,
    onTimeRate: due.length ? Math.round((onTime.length / due.length) * 100) : null,
  };
}

/**
 * SHIPTRACE domain types.
 *
 * These types are shared by the Demo Mode data source, the Supabase data
 * source, server actions, and UI components. They intentionally mirror the
 * database schema in `supabase/migrations`.
 */

export const MILESTONE_STATUSES = [
  "planned",
  "in_progress",
  "submitted_for_review",
  "shipped",
  "partially_shipped",
  "delayed",
  "no_evidence",
  "cancelled",
  "disputed",
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const IMPORTANCE_TIERS = ["core", "major", "minor"] as const;
export type ImportanceTier = (typeof IMPORTANCE_TIERS)[number];

export const EVIDENCE_TYPES = [
  "product_release",
  "repository_release",
  "official_announcement",
  "independent_reporting",
  "community_observation",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const REVIEW_STATES = ["pending", "accepted", "rejected", "needs_clarification"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const PROJECT_CATEGORIES = [
  "L1",
  "L2",
  "DeFi",
  "Infrastructure",
  "Wallet",
  "Gaming",
  "Identity",
  "Data",
  "Privacy",
  "Social",
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_STATUSES = ["published", "draft", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const USER_ROLES = ["guest", "user", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACTOR_KINDS = ["project", "community", "automated", "moderator"] as const;
/** Who is speaking: project claims, community submissions, automated observations, or moderator conclusions. */
export type ActorKind = (typeof ACTOR_KINDS)[number];

export const FEED_EVENT_TYPES = [
  "shipped",
  "partially_shipped",
  "delayed",
  "no_evidence",
  "new_commitment",
  "deadline_changed",
  "evidence_added",
  "dispute_resolved",
  "cancelled",
] as const;
export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];

export const DISPUTE_STATES = ["open", "under_review", "resolved", "rejected"] as const;
export type DisputeState = (typeof DISPUTE_STATES)[number];

export interface ProjectLink {
  id: string;
  projectId: string;
  label: string;
  url: string;
  kind: "website" | "docs" | "repository" | "social" | "app" | "other";
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ProjectCategory;
  ecosystem: string;
  officialUrl: string;
  status: ProjectStatus;
  /** 0–1 proportion of expected data that is present. */
  dataCompleteness: number;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
  links: ProjectLink[];
  /** Transparency inputs recorded by moderators. */
  transparency: TransparencySignals;
}

export interface TransparencySignals {
  /** Dated roadmap updates within the last 180 days. */
  datedRoadmapUpdates: number;
  /** Project published explanations for delays/cancellations (0..1). */
  explanationRate: number;
  /** Publicly accessible documentation present. */
  hasPublicDocs: boolean;
  /** Project discloses changes to roadmap items (0..1). */
  changeDisclosureRate: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  /** Short paraphrase of the commitment, never a large copyrighted passage. */
  commitmentParaphrase: string;
  sourceUrl: string;
  sourceAccessedAt: string;
  claimDate: string;
  deadline: string;
  originalDeadline: string;
  importance: ImportanceTier;
  status: MilestoneStatus;
  /** Milestones only count toward scores once a moderator has approved them. */
  moderatorApproved: boolean;
  moderatorNote: string | null;
  /** Timestamp when a "shipped"/"partially_shipped" status was verified. */
  deliveredAt: string | null;
  /** Project supplied an updated explanation (relevant to delayed credit). */
  hasUpdatedExplanation: boolean;
  createdAt: string;
  updatedAt: string;
  /** Public immutable audit identifier (database record, not a blockchain claim). */
  auditId: string;
}

export interface MilestoneStatusEvent {
  id: string;
  milestoneId: string;
  projectId: string;
  actorId: string;
  actorName: string;
  actorKind: ActorKind;
  priorStatus: MilestoneStatus | null;
  newStatus: MilestoneStatus;
  reason: string;
  evidenceIds: string[];
  createdAt: string;
  auditId: string;
}

export interface Evidence {
  id: string;
  projectId: string;
  milestoneId: string | null;
  url: string;
  type: EvidenceType;
  title: string;
  summary: string;
  publishedAt: string | null;
  accessedAt: string;
  submitterId: string;
  submitterName: string;
  submitterKind: ActorKind;
  reviewState: ReviewState;
  reviewReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  /** Community support/challenge counts. */
  supportCount: number;
  challengeCount: number;
  conflictOfInterest: string | null;
  createdAt: string;
  auditId: string;
}

export interface EvidenceReview {
  id: string;
  evidenceId: string;
  reviewerId: string;
  reviewerName: string;
  decision: ReviewState;
  reason: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  projectId: string;
  milestoneId: string | null;
  evidenceId: string | null;
  kind: "correction" | "dispute";
  submitterId: string;
  submitterName: string;
  submitterKind: ActorKind;
  claim: string;
  sourceUrl: string | null;
  state: DisputeState;
  resolution: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface GithubRepository {
  id: string;
  projectId: string;
  owner: string;
  repo: string;
  url: string;
  isPrimary: boolean;
}

export interface GithubSnapshot {
  id: string;
  repositoryId: string;
  projectId: string;
  defaultBranch: string | null;
  stars: number | null;
  openIssues: number | null;
  latestReleaseTag: string | null;
  latestReleaseAt: string | null;
  releasesLast90d: number;
  tagsLast90d: number;
  /** Weeks (of the last 12) with at least one meaningful public event. */
  activeWeeksLast12: number;
  lastPushAt: string | null;
  source: "github_api" | "demo";
  retrievedAt: string;
}

export interface WebsiteEndpoint {
  id: string;
  projectId: string;
  label: string;
  url: string;
  approved: boolean;
}

export interface WebsiteCheck {
  id: string;
  endpointId: string;
  projectId: string;
  httpStatus: number | null;
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface ScoreComponents {
  delivery: number | null;
  development: number | null;
  availability: number | null;
  transparency: number | null;
  evidence: number | null;
}

export interface ShipScoreSnapshot {
  id: string;
  projectId: string;
  total: number | null;
  components: ScoreComponents;
  /** 0–1 confidence derived from data completeness. */
  confidence: number;
  dataCompleteness: number;
  formulaVersion: string;
  insufficientData: boolean;
  insufficientReasons: string[];
  calculatedAt: string;
  /** Human-readable calculation trace so scores are explainable. */
  explanation: string[];
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  bio: string | null;
  watchlistPublic: boolean;
  acceptedEvidenceCount: number;
  helpfulCorrectionsCount: number;
  createdAt: string;
  isDemo: boolean;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface UserBadge {
  userId: string;
  badgeId: string;
  awardedAt: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  projectId: string;
  addedAt: string;
}

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  projectId: string;
  milestoneId: string | null;
  evidenceId: string | null;
  title: string;
  summary: string;
  sourceUrl: string;
  occurredAt: string;
  verified: boolean;
}

export interface AdminAuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string | null;
  username: string;
  displayName: string;
  role: UserRole;
  isDemo: boolean;
}

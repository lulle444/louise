import type {
  AdminAuditEntry,
  Badge,
  Dispute,
  DisputeState,
  Evidence,
  EvidenceType,
  FeedEvent,
  FeedEventType,
  GithubRepository,
  GithubSnapshot,
  ImportanceTier,
  Milestone,
  MilestoneStatus,
  MilestoneStatusEvent,
  Profile,
  Project,
  ProjectCategory,
  ProjectStatus,
  ReviewState,
  SessionUser,
  ShipScoreSnapshot,
  Watchlist,
  WatchlistItem,
  WebsiteCheck,
  WebsiteEndpoint,
} from "@/lib/domain/types";
import type { ScoreBand } from "@/lib/domain/score";

export type SortKey = "score" | "name" | "next_deadline" | "last_evidence" | "delivered";

export interface ProjectFilters {
  q?: string;
  category?: ProjectCategory | "";
  ecosystem?: string;
  milestoneStatus?: MilestoneStatus | "";
  band?: ScoreBand | "";
  evidenceRecency?: "7d" | "30d" | "90d" | "";
  activity?: "active" | "quiet" | "none" | "";
  sort?: SortKey;
  includeUnpublished?: boolean;
}

export interface ProjectSummary {
  project: Project;
  score: ShipScoreSnapshot | null;
  milestonesTotal: number;
  milestonesDelivered: number;
  nextDeadline: Milestone | null;
  lastEvidenceAt: string | null;
  lastActivityAt: string | null;
  dataCheckedAt: string;
}

export interface ProjectBundle {
  project: Project;
  milestones: Milestone[];
  statusEvents: MilestoneStatusEvent[];
  evidence: Evidence[];
  disputes: Dispute[];
  scoreHistory: ShipScoreSnapshot[];
  latestScore: ShipScoreSnapshot | null;
  githubRepositories: GithubRepository[];
  githubSnapshots: GithubSnapshot[];
  endpoints: WebsiteEndpoint[];
  websiteChecks: WebsiteCheck[];
  feedEvents: FeedEvent[];
}

export interface EvidenceFilter {
  projectId?: string;
  milestoneId?: string;
  reviewState?: ReviewState;
  submitterId?: string;
  limit?: number;
}

export interface DisputeFilter {
  projectId?: string;
  milestoneId?: string;
  state?: DisputeState;
  submitterId?: string;
}

export interface FeedFilter {
  types?: FeedEventType[];
  projectId?: string;
  limit?: number;
  verifiedOnly?: boolean;
}

export interface MilestoneFilter {
  projectId?: string;
  status?: MilestoneStatus;
  dueAfter?: string;
  dueBefore?: string;
}

export interface NewEvidenceInput {
  projectId: string;
  milestoneId: string;
  url: string;
  type: EvidenceType;
  title: string;
  summary: string;
  publishedAt: string | null;
  conflictOfInterest: string | null;
  submitter: SessionUser;
}

export interface NewDisputeInput {
  projectId: string;
  milestoneId: string | null;
  evidenceId: string | null;
  kind: "correction" | "dispute";
  claim: string;
  sourceUrl: string | null;
  submitter: SessionUser;
}

export interface ProjectSuggestion {
  id: string;
  name: string;
  officialUrl: string;
  category: ProjectCategory;
  ecosystem: string;
  description: string;
  roadmapUrl: string;
  submitterId: string;
  submitterName: string;
  state: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface NewProjectSuggestionInput {
  name: string;
  officialUrl: string;
  category: ProjectCategory;
  ecosystem: string;
  description: string;
  roadmapUrl: string;
  submitter: SessionUser;
}

export interface ReviewEvidenceInput {
  evidenceId: string;
  decision: "accepted" | "rejected" | "needs_clarification";
  reason: string;
  reviewer: SessionUser;
}

export interface StatusChangeInput {
  milestoneId: string;
  newStatus: MilestoneStatus;
  reason: string;
  evidenceIds: string[];
  actor: SessionUser;
  actorKind?: "moderator" | "automated";
}

export interface ResolveDisputeInput {
  disputeId: string;
  state: "under_review" | "resolved" | "rejected";
  resolution: string;
  actor: SessionUser;
}

export interface ProjectUpsertInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  category: ProjectCategory;
  ecosystem: string;
  officialUrl: string;
  status: ProjectStatus;
  actor: SessionUser;
}

export interface MilestoneCreateInput {
  projectId: string;
  title: string;
  commitmentParaphrase: string;
  sourceUrl: string;
  claimDate: string;
  deadline: string;
  importance: ImportanceTier;
  actor: SessionUser;
}

export interface IntegrationStatus {
  github: { configured: boolean; repositories: number; lastRetrievedAt: string | null; failures: number };
  website: { configured: boolean; endpoints: number; lastCheckedAt: string | null; recentFailures: number };
  scores: { lastCalculatedAt: string | null; formulaVersion: string | null };
}

export interface Stats {
  projects: number;
  milestones: number;
  acceptedEvidence: number;
  pendingEvidence: number;
  openDisputes: number;
  contributors: number;
}

export interface DataSource {
  readonly mode: "demo" | "supabase";

  // Reads
  listProjectSummaries(filters?: ProjectFilters): Promise<ProjectSummary[]>;
  getProjectBySlug(slug: string): Promise<Project | null>;
  getProjectById(id: string): Promise<Project | null>;
  getProjectBundle(slug: string): Promise<ProjectBundle | null>;
  listMilestones(filter?: MilestoneFilter): Promise<Milestone[]>;
  getMilestone(id: string): Promise<Milestone | null>;
  listStatusEvents(milestoneId: string): Promise<MilestoneStatusEvent[]>;
  listEvidence(filter?: EvidenceFilter): Promise<Evidence[]>;
  getEvidence(id: string): Promise<Evidence | null>;
  listDisputes(filter?: DisputeFilter): Promise<Dispute[]>;
  getDispute(id: string): Promise<Dispute | null>;
  listScoreHistory(projectId: string): Promise<ShipScoreSnapshot[]>;
  getLatestScore(projectId: string): Promise<ShipScoreSnapshot | null>;
  listFeedEvents(filter?: FeedFilter): Promise<FeedEvent[]>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  getProfileById(id: string): Promise<Profile | null>;
  listUserBadges(userId: string): Promise<Badge[]>;
  getWatchlistForUser(userId: string): Promise<{ watchlist: Watchlist; items: WatchlistItem[] } | null>;
  listAdminAudit(limit?: number): Promise<AdminAuditEntry[]>;
  listGithubRepositories(projectId?: string): Promise<GithubRepository[]>;
  listGithubSnapshots(projectId: string): Promise<GithubSnapshot[]>;
  listWebsiteEndpoints(projectId?: string): Promise<WebsiteEndpoint[]>;
  listWebsiteChecks(projectId: string): Promise<WebsiteCheck[]>;
  listProjectSuggestions(): Promise<ProjectSuggestion[]>;
  getIntegrationStatus(): Promise<IntegrationStatus>;
  getStats(): Promise<Stats>;

  // Writes (all mutations create audit records where relevant)
  createEvidence(input: NewEvidenceInput): Promise<Evidence>;
  createDispute(input: NewDisputeInput): Promise<Dispute>;
  createProjectSuggestion(input: NewProjectSuggestionInput): Promise<ProjectSuggestion>;
  reviewEvidence(input: ReviewEvidenceInput): Promise<Evidence>;
  changeMilestoneStatus(input: StatusChangeInput): Promise<{ milestone: Milestone; event: MilestoneStatusEvent }>;
  resolveDispute(input: ResolveDisputeInput): Promise<Dispute>;
  upsertProject(input: ProjectUpsertInput): Promise<Project>;
  createMilestone(input: MilestoneCreateInput): Promise<Milestone>;
  setMilestoneApproval(milestoneId: string, approved: boolean, reason: string, actor: SessionUser): Promise<Milestone>;
  recordScoreSnapshot(snapshot: Omit<ShipScoreSnapshot, "id">, actor: SessionUser | null): Promise<ShipScoreSnapshot>;
  toggleWatchlistItem(userId: string, projectId: string): Promise<{ watching: boolean }>;
  setWatchlistVisibility(userId: string, isPublic: boolean): Promise<void>;
  recordGithubSnapshot(snapshot: Omit<GithubSnapshot, "id">): Promise<{ snapshot: GithubSnapshot; created: boolean }>;
  recordWebsiteCheck(check: Omit<WebsiteCheck, "id">): Promise<{ check: WebsiteCheck; created: boolean }>;
  voteEvidence(evidenceId: string, vote: "support" | "challenge", userId: string): Promise<Evidence>;
}

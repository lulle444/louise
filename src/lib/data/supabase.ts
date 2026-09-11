import type { SupabaseClient } from "@supabase/supabase-js";
import { auditIdFor } from "@/lib/demo/seed";
import { STATUS_LABELS } from "@/lib/domain/status";
import type {
  AdminAuditEntry,
  Badge,
  Dispute,
  Evidence,
  FeedEvent,
  FeedEventType,
  GithubRepository,
  GithubSnapshot,
  Milestone,
  MilestoneStatusEvent,
  Profile,
  Project,
  ProjectLink,
  SessionUser,
  ShipScoreSnapshot,
  Watchlist,
  WatchlistItem,
  WebsiteCheck,
  WebsiteEndpoint,
} from "@/lib/domain/types";
import { getConfig } from "@/lib/config";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSummary, filterAndSortSummaries } from "./summaries";
import type {
  DataSource,
  DisputeFilter,
  EvidenceFilter,
  FeedFilter,
  IntegrationStatus,
  MilestoneCreateInput,
  MilestoneFilter,
  NewDisputeInput,
  NewEvidenceInput,
  NewProjectSuggestionInput,
  ProjectBundle,
  ProjectFilters,
  ProjectSummary,
  ProjectSuggestion,
  ProjectUpsertInput,
  ResolveDisputeInput,
  ReviewEvidenceInput,
  StatusChangeInput,
  Stats,
} from "./types";

type Row = Record<string, any>;

const DAY = 86_400_000;

function iso(value: unknown): string {
  return value ? new Date(String(value)).toISOString() : new Date(0).toISOString();
}
function isoOrNull(value: unknown): string | null {
  return value ? new Date(String(value)).toISOString() : null;
}
function dateOnly(value: unknown): string {
  return String(value).slice(0, 10);
}

const mapLink = (r: Row): ProjectLink => ({ id: r.id, projectId: r.project_id, label: r.label, url: r.url, kind: r.kind });

const mapProject = (r: Row, links: ProjectLink[] = []): Project => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  category: r.category,
  ecosystem: r.ecosystem,
  officialUrl: r.official_url,
  status: r.status,
  dataCompleteness: Number(r.data_completeness ?? 0),
  lastVerifiedAt: isoOrNull(r.last_verified_at),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
  isDemo: !!r.is_demo,
  links,
  transparency: r.transparency ?? { datedRoadmapUpdates: 0, explanationRate: 0, hasPublicDocs: false, changeDisclosureRate: 0 },
});

const mapMilestone = (r: Row): Milestone => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  commitmentParaphrase: r.commitment_paraphrase,
  sourceUrl: r.source_url,
  sourceAccessedAt: iso(r.source_accessed_at),
  claimDate: dateOnly(r.claim_date),
  deadline: dateOnly(r.deadline),
  originalDeadline: dateOnly(r.original_deadline),
  importance: r.importance,
  status: r.status,
  moderatorApproved: !!r.moderator_approved,
  moderatorNote: r.moderator_note ?? null,
  deliveredAt: isoOrNull(r.delivered_at),
  hasUpdatedExplanation: !!r.has_updated_explanation,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
  auditId: r.audit_id,
});

const mapStatusEvent = (r: Row): MilestoneStatusEvent => ({
  id: r.id,
  milestoneId: r.milestone_id,
  projectId: r.project_id,
  actorId: r.actor_id,
  actorName: r.actor_name,
  actorKind: r.actor_kind,
  priorStatus: r.prior_status ?? null,
  newStatus: r.new_status,
  reason: r.reason,
  evidenceIds: r.evidence_ids ?? [],
  createdAt: iso(r.created_at),
  auditId: r.audit_id,
});

const mapEvidence = (r: Row): Evidence => ({
  id: r.id,
  projectId: r.project_id,
  milestoneId: r.milestone_id ?? null,
  url: r.url,
  type: r.type,
  title: r.title,
  summary: r.summary,
  publishedAt: r.published_at ? dateOnly(r.published_at) : null,
  accessedAt: iso(r.accessed_at),
  submitterId: r.submitter_id,
  submitterName: r.submitter_name,
  submitterKind: r.submitter_kind,
  reviewState: r.review_state,
  reviewReason: r.review_reason ?? null,
  reviewedById: r.reviewed_by_id ?? null,
  reviewedAt: isoOrNull(r.reviewed_at),
  supportCount: r.support_count ?? 0,
  challengeCount: r.challenge_count ?? 0,
  conflictOfInterest: r.conflict_of_interest ?? null,
  createdAt: iso(r.created_at),
  auditId: r.audit_id,
});

const mapDispute = (r: Row): Dispute => ({
  id: r.id,
  projectId: r.project_id,
  milestoneId: r.milestone_id ?? null,
  evidenceId: r.evidence_id ?? null,
  kind: r.kind,
  submitterId: r.submitter_id,
  submitterName: r.submitter_name,
  submitterKind: r.submitter_kind,
  claim: r.claim,
  sourceUrl: r.source_url ?? null,
  state: r.state,
  resolution: r.resolution ?? null,
  resolvedById: r.resolved_by_id ?? null,
  resolvedAt: isoOrNull(r.resolved_at),
  createdAt: iso(r.created_at),
});

const mapScore = (r: Row): ShipScoreSnapshot => ({
  id: r.id,
  projectId: r.project_id,
  total: r.total ?? null,
  components: r.components,
  confidence: Number(r.confidence),
  dataCompleteness: Number(r.data_completeness),
  formulaVersion: r.formula_version,
  insufficientData: !!r.insufficient_data,
  insufficientReasons: r.insufficient_reasons ?? [],
  calculatedAt: iso(r.calculated_at),
  explanation: r.explanation ?? [],
});

const mapRepo = (r: Row): GithubRepository => ({ id: r.id, projectId: r.project_id, owner: r.owner, repo: r.repo, url: r.url, isPrimary: !!r.is_primary });

const mapGithubSnapshot = (r: Row): GithubSnapshot => ({
  id: r.id,
  repositoryId: r.repository_id,
  projectId: r.project_id,
  defaultBranch: r.default_branch ?? null,
  stars: r.stars ?? null,
  openIssues: r.open_issues ?? null,
  latestReleaseTag: r.latest_release_tag ?? null,
  latestReleaseAt: isoOrNull(r.latest_release_at),
  releasesLast90d: r.releases_last_90d ?? 0,
  tagsLast90d: r.tags_last_90d ?? 0,
  activeWeeksLast12: r.active_weeks_last_12 ?? 0,
  lastPushAt: isoOrNull(r.last_push_at),
  source: r.source,
  retrievedAt: iso(r.retrieved_at),
});

const mapEndpoint = (r: Row): WebsiteEndpoint => ({ id: r.id, projectId: r.project_id, label: r.label, url: r.url, approved: !!r.approved });

const mapCheck = (r: Row): WebsiteCheck => ({
  id: r.id,
  endpointId: r.endpoint_id,
  projectId: r.project_id,
  httpStatus: r.http_status ?? null,
  ok: !!r.ok,
  latencyMs: r.latency_ms ?? null,
  error: r.error ?? null,
  checkedAt: iso(r.checked_at),
});

const mapFeed = (r: Row): FeedEvent => ({
  id: r.id,
  type: r.type,
  projectId: r.project_id,
  milestoneId: r.milestone_id ?? null,
  evidenceId: r.evidence_id ?? null,
  title: r.title,
  summary: r.summary,
  sourceUrl: r.source_url,
  occurredAt: iso(r.occurred_at),
  verified: !!r.verified,
});

const mapProfile = (r: Row): Profile => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  role: r.role,
  bio: r.bio ?? null,
  watchlistPublic: !!r.watchlist_public,
  acceptedEvidenceCount: r.accepted_evidence_count ?? 0,
  helpfulCorrectionsCount: r.helpful_corrections_count ?? 0,
  createdAt: iso(r.created_at),
  isDemo: !!r.is_demo,
});

const mapAudit = (r: Row): AdminAuditEntry => ({
  id: r.id,
  actorId: r.actor_id,
  actorName: r.actor_name,
  action: r.action,
  targetType: r.target_type,
  targetId: r.target_id,
  reason: r.reason,
  before: r.before,
  after: r.after,
  createdAt: iso(r.created_at),
});

const mapSuggestion = (r: Row): ProjectSuggestion => ({
  id: r.id,
  name: r.name,
  officialUrl: r.official_url,
  category: r.category,
  ecosystem: r.ecosystem,
  description: r.description,
  roadmapUrl: r.roadmap_url,
  submitterId: r.submitter_id,
  submitterName: r.submitter_name,
  state: r.state,
  createdAt: iso(r.created_at),
});

function unwrap<T>(result: { data: T; error: { message: string } | null }, context: string): NonNullable<T> {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${context}: no data returned`);
  return result.data as NonNullable<T>;
}

/**
 * Supabase-backed data source.
 *
 * Reads use the cookie-aware client so Row Level Security applies to the
 * current user. Writes use the service-role client when configured (server
 * actions enforce authorization before calling), otherwise the user client
 * where RLS enforces the same rules.
 */
export class SupabaseDataSource implements DataSource {
  readonly mode = "supabase" as const;

  private async reader(): Promise<SupabaseClient> {
    const client = await createSupabaseServerClient();
    if (!client) throw new Error("Supabase is not configured");
    return client;
  }

  private async writer(): Promise<SupabaseClient> {
    return createSupabaseAdminClient() ?? (await this.reader());
  }

  private async audit(entry: Omit<AdminAuditEntry, "id" | "createdAt">) {
    const db = await this.writer();
    const { error } = await db.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      reason: entry.reason,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
    if (error) throw new Error(`audit: ${error.message}`);
  }

  private async feed(event: Omit<FeedEvent, "id">) {
    const db = await this.writer();
    const { error } = await db.from("feed_events").insert({
      type: event.type,
      project_id: event.projectId,
      milestone_id: event.milestoneId,
      evidence_id: event.evidenceId,
      title: event.title,
      summary: event.summary,
      source_url: event.sourceUrl,
      occurred_at: event.occurredAt,
      verified: event.verified,
    });
    if (error) throw new Error(`feed: ${error.message}`);
  }

  private async projectsWithLinks(db: SupabaseClient, filter?: (q: ReturnType<SupabaseClient["from"]>["select"] extends never ? never : Row) => Row): Promise<Project[]> {
    let query = db.from("projects").select("*").order("name");
    if (filter) query = filter(query) as typeof query;
    const rows = unwrap(await query, "projects");
    if (rows.length === 0) return [];
    const ids = rows.map((r: Row) => r.id);
    const links = unwrap(await db.from("project_links").select("*").in("project_id", ids), "project_links");
    return rows.map((r: Row) => mapProject(r, links.filter((l: Row) => l.project_id === r.id).map(mapLink)));
  }

  async listProjectSummaries(filters: ProjectFilters = {}): Promise<ProjectSummary[]> {
    const db = await this.reader();
    const now = new Date();
    const projects = await this.projectsWithLinks(db);
    if (projects.length === 0) return [];
    const ids = projects.map((p) => p.id);
    const [milestones, evidence, scores, gh, checks] = await Promise.all([
      db.from("milestones").select("*").in("project_id", ids),
      db.from("evidence").select("*").in("project_id", ids).eq("review_state", "accepted"),
      db.from("ship_score_snapshots").select("*").in("project_id", ids).order("calculated_at", { ascending: false }),
      db.from("github_snapshots").select("*").in("project_id", ids).order("retrieved_at", { ascending: false }),
      db.from("website_checks").select("*").in("project_id", ids).gte("checked_at", new Date(now.getTime() - 30 * DAY).toISOString()),
    ]);
    const milestoneRows = unwrap(milestones, "milestones").map(mapMilestone);
    const evidenceRows = unwrap(evidence, "evidence").map(mapEvidence);
    const scoreRows = unwrap(scores, "scores").map(mapScore);
    const ghRows = unwrap(gh, "github_snapshots").map(mapGithubSnapshot);
    const checkRows = unwrap(checks, "website_checks").map(mapCheck);
    const byProject = new Map<string, Milestone[]>();
    for (const m of milestoneRows) byProject.set(m.projectId, [...(byProject.get(m.projectId) ?? []), m]);
    const summaries = projects.map((project) =>
      buildSummary(
        {
          project,
          milestones: byProject.get(project.id) ?? [],
          score: scoreRows.find((s) => s.projectId === project.id) ?? null,
          evidence: evidenceRows.filter((e) => e.projectId === project.id),
          githubSnapshots: ghRows.filter((s) => s.projectId === project.id),
          websiteChecks: checkRows.filter((c) => c.projectId === project.id),
        },
        now,
      ),
    );
    return filterAndSortSummaries(summaries, byProject, filters, now);
  }

  async getProjectBySlug(slug: string): Promise<Project | null> {
    const db = await this.reader();
    const rows = await this.projectsWithLinks(db, (q) => q.eq("slug", slug));
    return rows[0] ?? null;
  }

  async getProjectById(id: string): Promise<Project | null> {
    const db = await this.reader();
    const rows = await this.projectsWithLinks(db, (q) => q.eq("id", id));
    return rows[0] ?? null;
  }

  async getProjectBundle(slug: string): Promise<ProjectBundle | null> {
    const project = await this.getProjectBySlug(slug);
    if (!project) return null;
    const db = await this.reader();
    const id = project.id;
    const [milestones, events, evidence, disputes, scores, repos, gh, endpoints, checks, feed] = await Promise.all([
      db.from("milestones").select("*").eq("project_id", id).order("deadline"),
      db.from("milestone_status_events").select("*").eq("project_id", id).order("created_at"),
      db.from("evidence").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      db.from("disputes").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      db.from("ship_score_snapshots").select("*").eq("project_id", id).order("calculated_at"),
      db.from("github_repositories").select("*").eq("project_id", id),
      db.from("github_snapshots").select("*").eq("project_id", id).order("retrieved_at"),
      db.from("website_endpoints").select("*").eq("project_id", id),
      db.from("website_checks").select("*").eq("project_id", id).order("checked_at").limit(600),
      db.from("feed_events").select("*").eq("project_id", id).order("occurred_at", { ascending: false }).limit(100),
    ]);
    const scoreHistory = unwrap(scores, "scores").map(mapScore);
    return {
      project,
      milestones: unwrap(milestones, "milestones").map(mapMilestone),
      statusEvents: unwrap(events, "events").map(mapStatusEvent),
      evidence: unwrap(evidence, "evidence").map(mapEvidence),
      disputes: unwrap(disputes, "disputes").map(mapDispute),
      scoreHistory,
      latestScore: scoreHistory.at(-1) ?? null,
      githubRepositories: unwrap(repos, "repos").map(mapRepo),
      githubSnapshots: unwrap(gh, "github").map(mapGithubSnapshot),
      endpoints: unwrap(endpoints, "endpoints").map(mapEndpoint),
      websiteChecks: unwrap(checks, "checks").map(mapCheck),
      feedEvents: unwrap(feed, "feed").map(mapFeed),
    };
  }

  async listMilestones(filter: MilestoneFilter = {}): Promise<Milestone[]> {
    const db = await this.reader();
    let q = db.from("milestones").select("*").order("deadline");
    if (filter.projectId) q = q.eq("project_id", filter.projectId);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.dueAfter) q = q.gte("deadline", filter.dueAfter);
    if (filter.dueBefore) q = q.lte("deadline", filter.dueBefore);
    return unwrap(await q, "milestones").map(mapMilestone);
  }

  async getMilestone(id: string): Promise<Milestone | null> {
    const db = await this.reader();
    const { data } = await db.from("milestones").select("*").eq("id", id).maybeSingle();
    return data ? mapMilestone(data) : null;
  }

  async listStatusEvents(milestoneId: string): Promise<MilestoneStatusEvent[]> {
    const db = await this.reader();
    return unwrap(await db.from("milestone_status_events").select("*").eq("milestone_id", milestoneId).order("created_at"), "events").map(mapStatusEvent);
  }

  async listEvidence(filter: EvidenceFilter = {}): Promise<Evidence[]> {
    const db = await this.reader();
    let q = db.from("evidence").select("*").order("created_at", { ascending: false });
    if (filter.projectId) q = q.eq("project_id", filter.projectId);
    if (filter.milestoneId) q = q.eq("milestone_id", filter.milestoneId);
    if (filter.reviewState) q = q.eq("review_state", filter.reviewState);
    if (filter.submitterId) q = q.eq("submitter_id", filter.submitterId);
    if (filter.limit) q = q.limit(filter.limit);
    return unwrap(await q, "evidence").map(mapEvidence);
  }

  async getEvidence(id: string): Promise<Evidence | null> {
    const db = await this.reader();
    const { data } = await db.from("evidence").select("*").eq("id", id).maybeSingle();
    return data ? mapEvidence(data) : null;
  }

  async listDisputes(filter: DisputeFilter = {}): Promise<Dispute[]> {
    const db = await this.reader();
    let q = db.from("disputes").select("*").order("created_at", { ascending: false });
    if (filter.projectId) q = q.eq("project_id", filter.projectId);
    if (filter.milestoneId) q = q.eq("milestone_id", filter.milestoneId);
    if (filter.state) q = q.eq("state", filter.state);
    if (filter.submitterId) q = q.eq("submitter_id", filter.submitterId);
    return unwrap(await q, "disputes").map(mapDispute);
  }

  async getDispute(id: string): Promise<Dispute | null> {
    const db = await this.reader();
    const { data } = await db.from("disputes").select("*").eq("id", id).maybeSingle();
    return data ? mapDispute(data) : null;
  }

  async listScoreHistory(projectId: string): Promise<ShipScoreSnapshot[]> {
    const db = await this.reader();
    return unwrap(await db.from("ship_score_snapshots").select("*").eq("project_id", projectId).order("calculated_at"), "scores").map(mapScore);
  }

  async getLatestScore(projectId: string): Promise<ShipScoreSnapshot | null> {
    const db = await this.reader();
    const { data } = await db.from("ship_score_snapshots").select("*").eq("project_id", projectId).order("calculated_at", { ascending: false }).limit(1).maybeSingle();
    return data ? mapScore(data) : null;
  }

  async listFeedEvents(filter: FeedFilter = {}): Promise<FeedEvent[]> {
    const db = await this.reader();
    let q = db.from("feed_events").select("*").order("occurred_at", { ascending: false });
    if (filter.projectId) q = q.eq("project_id", filter.projectId);
    if (filter.types?.length) q = q.in("type", filter.types);
    if (filter.verifiedOnly) q = q.eq("verified", true);
    q = q.limit(filter.limit ?? 200);
    return unwrap(await q, "feed").map(mapFeed);
  }

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const db = await this.reader();
    const { data } = await db.from("profiles").select("*").eq("username", username).maybeSingle();
    return data ? mapProfile(data) : null;
  }

  async getProfileById(id: string): Promise<Profile | null> {
    const db = await this.reader();
    const { data } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
    return data ? mapProfile(data) : null;
  }

  async listUserBadges(userId: string): Promise<Badge[]> {
    const db = await this.reader();
    const rows = unwrap(await db.from("user_badges").select("badge_id, badges(*)").eq("user_id", userId), "user_badges");
    return rows.map((r: Row) => r.badges).filter(Boolean).map((b: Row) => ({ id: b.id, slug: b.slug, name: b.name, description: b.description }));
  }

  async getWatchlistForUser(userId: string): Promise<{ watchlist: Watchlist; items: WatchlistItem[] } | null> {
    const db = await this.writer();
    const { data: existingList } = await db.from("watchlists").select("*").eq("user_id", userId).eq("name", "Following").maybeSingle();
    let wl: Row;
    if (existingList) {
      wl = existingList;
    } else {
      const profile = await this.getProfileById(userId);
      const inserted = await db.from("watchlists").insert({ user_id: userId, name: "Following", is_public: profile?.watchlistPublic ?? false }).select("*").single();
      wl = unwrap(inserted, "watchlists");
    }
    const items = unwrap(await db.from("watchlist_items").select("*").eq("watchlist_id", wl.id).order("added_at", { ascending: false }), "watchlist_items");
    return {
      watchlist: { id: wl.id, userId: wl.user_id, name: wl.name, isPublic: !!wl.is_public },
      items: items.map((i: Row) => ({ id: i.id, watchlistId: i.watchlist_id, projectId: i.project_id, addedAt: iso(i.added_at) })),
    };
  }

  async listAdminAudit(limit = 50): Promise<AdminAuditEntry[]> {
    const db = await this.reader();
    return unwrap(await db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limit), "audit").map(mapAudit);
  }

  async listGithubRepositories(projectId?: string): Promise<GithubRepository[]> {
    const db = await this.reader();
    let q = db.from("github_repositories").select("*");
    if (projectId) q = q.eq("project_id", projectId);
    return unwrap(await q, "repos").map(mapRepo);
  }

  async listGithubSnapshots(projectId: string): Promise<GithubSnapshot[]> {
    const db = await this.reader();
    return unwrap(await db.from("github_snapshots").select("*").eq("project_id", projectId).order("retrieved_at"), "github").map(mapGithubSnapshot);
  }

  async listWebsiteEndpoints(projectId?: string): Promise<WebsiteEndpoint[]> {
    const db = await this.reader();
    let q = db.from("website_endpoints").select("*");
    if (projectId) q = q.eq("project_id", projectId);
    return unwrap(await q, "endpoints").map(mapEndpoint);
  }

  async listWebsiteChecks(projectId: string): Promise<WebsiteCheck[]> {
    const db = await this.reader();
    return unwrap(await db.from("website_checks").select("*").eq("project_id", projectId).order("checked_at").limit(600), "checks").map(mapCheck);
  }

  async listProjectSuggestions(): Promise<ProjectSuggestion[]> {
    const db = await this.reader();
    return unwrap(await db.from("project_suggestions").select("*").order("created_at", { ascending: false }), "suggestions").map(mapSuggestion);
  }

  async getIntegrationStatus(): Promise<IntegrationStatus> {
    const db = await this.reader();
    const config = getConfig();
    const [repos, endpoints, lastGh, lastCheck, failures, lastScore] = await Promise.all([
      db.from("github_repositories").select("id", { count: "exact", head: true }),
      db.from("website_endpoints").select("id", { count: "exact", head: true }),
      db.from("github_snapshots").select("retrieved_at").order("retrieved_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("website_checks").select("checked_at").order("checked_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("website_checks").select("id", { count: "exact", head: true }).eq("ok", false).gte("checked_at", new Date(Date.now() - 7 * DAY).toISOString()),
      db.from("ship_score_snapshots").select("calculated_at, formula_version").order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      github: { configured: !!config.githubToken, repositories: repos.count ?? 0, lastRetrievedAt: isoOrNull(lastGh.data?.retrieved_at), failures: 0 },
      website: { configured: !!config.websiteCheckSecret, endpoints: endpoints.count ?? 0, lastCheckedAt: isoOrNull(lastCheck.data?.checked_at), recentFailures: failures.count ?? 0 },
      scores: { lastCalculatedAt: isoOrNull(lastScore.data?.calculated_at), formulaVersion: lastScore.data?.formula_version ?? null },
    };
  }

  async getStats(): Promise<Stats> {
    const db = await this.reader();
    const [projects, milestones, accepted, pending, disputes, contributors] = await Promise.all([
      db.from("projects").select("id", { count: "exact", head: true }).eq("status", "published"),
      db.from("milestones").select("id", { count: "exact", head: true }),
      db.from("evidence").select("id", { count: "exact", head: true }).eq("review_state", "accepted"),
      db.from("evidence").select("id", { count: "exact", head: true }).eq("review_state", "pending"),
      db.from("disputes").select("id", { count: "exact", head: true }).in("state", ["open", "under_review"]),
      db.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    return {
      projects: projects.count ?? 0,
      milestones: milestones.count ?? 0,
      acceptedEvidence: accepted.count ?? 0,
      pendingEvidence: pending.count ?? 0,
      openDisputes: disputes.count ?? 0,
      contributors: contributors.count ?? 0,
    };
  }

  // ---------------------------------------------------------------- writes

  async createEvidence(input: NewEvidenceInput): Promise<Evidence> {
    const db = await this.writer();
    const nowIso = new Date().toISOString();
    const inserted = unwrap(
      await db
        .from("evidence")
        .insert({
          project_id: input.projectId,
          milestone_id: input.milestoneId,
          url: input.url,
          type: input.type,
          title: input.title,
          summary: input.summary,
          published_at: input.publishedAt,
          accessed_at: nowIso,
          submitter_id: input.submitter.id,
          submitter_name: input.submitter.displayName,
          submitter_kind: "community",
          review_state: "pending",
          conflict_of_interest: input.conflictOfInterest,
        })
        .select("*")
        .single(),
      "evidence insert",
    );
    const evidence = mapEvidence(inserted);
    const milestone = await this.getMilestone(input.milestoneId);
    if (milestone && (milestone.status === "planned" || milestone.status === "in_progress")) {
      await db.from("milestone_status_events").insert({
        milestone_id: milestone.id,
        project_id: milestone.projectId,
        actor_id: "system",
        actor_name: "SHIPTRACE automated intake",
        actor_kind: "automated",
        prior_status: milestone.status,
        new_status: "submitted_for_review",
        reason: "Community evidence submitted; pending moderator review. Verified status is unchanged until a moderator decides.",
        evidence_ids: [evidence.id],
      });
      await db.from("milestones").update({ status: "submitted_for_review" }).eq("id", milestone.id);
    }
    return evidence;
  }

  async createDispute(input: NewDisputeInput): Promise<Dispute> {
    const db = await this.writer();
    const inserted = unwrap(
      await db
        .from("disputes")
        .insert({
          project_id: input.projectId,
          milestone_id: input.milestoneId,
          evidence_id: input.evidenceId,
          kind: input.kind,
          submitter_id: input.submitter.id,
          submitter_name: input.submitter.displayName,
          submitter_kind: "community",
          claim: input.claim,
          source_url: input.sourceUrl,
          state: "open",
        })
        .select("*")
        .single(),
      "dispute insert",
    );
    return mapDispute(inserted);
  }

  async createProjectSuggestion(input: NewProjectSuggestionInput): Promise<ProjectSuggestion> {
    const db = await this.writer();
    const inserted = unwrap(
      await db
        .from("project_suggestions")
        .insert({
          name: input.name,
          official_url: input.officialUrl,
          category: input.category,
          ecosystem: input.ecosystem,
          description: input.description,
          roadmap_url: input.roadmapUrl,
          submitter_id: input.submitter.id,
          submitter_name: input.submitter.displayName,
        })
        .select("*")
        .single(),
      "suggestion insert",
    );
    return mapSuggestion(inserted);
  }

  async reviewEvidence(input: ReviewEvidenceInput): Promise<Evidence> {
    const db = await this.writer();
    const existing = await this.getEvidence(input.evidenceId);
    if (!existing) throw new Error("Evidence not found");
    const nowIso = new Date().toISOString();
    const updated = unwrap(
      await db
        .from("evidence")
        .update({ review_state: input.decision, review_reason: input.reason, reviewed_by_id: input.reviewer.id, reviewed_at: nowIso })
        .eq("id", input.evidenceId)
        .select("*")
        .single(),
      "evidence update",
    );
    await db.from("evidence_reviews").insert({
      evidence_id: input.evidenceId,
      reviewer_id: input.reviewer.id,
      reviewer_name: input.reviewer.displayName,
      decision: input.decision,
      reason: input.reason,
    });
    await this.audit({
      actorId: input.reviewer.id,
      actorName: input.reviewer.displayName,
      action: "evidence.review",
      targetType: "evidence",
      targetId: input.evidenceId,
      reason: input.reason,
      before: { reviewState: existing.reviewState },
      after: { reviewState: input.decision },
    });
    const evidence = mapEvidence(updated);
    if (input.decision === "accepted") {
      const project = await this.getProjectById(evidence.projectId);
      const milestone = evidence.milestoneId ? await this.getMilestone(evidence.milestoneId) : null;
      await this.feed({
        type: "evidence_added",
        projectId: evidence.projectId,
        milestoneId: evidence.milestoneId,
        evidenceId: evidence.id,
        title: `${project?.name ?? "Project"}: evidence accepted${milestone ? ` for “${milestone.title}”` : ""}`,
        summary: `${evidence.title} — verified from public evidence.`,
        sourceUrl: evidence.url,
        occurredAt: nowIso,
        verified: true,
      });
      await db.rpc("increment_accepted_evidence", { p_user_id: evidence.submitterId }).then(() => undefined, () => undefined);
    }
    return evidence;
  }

  async changeMilestoneStatus(input: StatusChangeInput): Promise<{ milestone: Milestone; event: MilestoneStatusEvent }> {
    const db = await this.writer();
    const milestone = await this.getMilestone(input.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    const nowIso = new Date().toISOString();
    const eventRow = unwrap(
      await db
        .from("milestone_status_events")
        .insert({
          milestone_id: milestone.id,
          project_id: milestone.projectId,
          actor_id: input.actor.id,
          actor_name: input.actor.displayName,
          actor_kind: input.actorKind ?? "moderator",
          prior_status: milestone.status,
          new_status: input.newStatus,
          reason: input.reason,
          evidence_ids: input.evidenceIds,
        })
        .select("*")
        .single(),
      "status event insert",
    );
    const patch: Row = { status: input.newStatus };
    if ((input.newStatus === "shipped" || input.newStatus === "partially_shipped") && !milestone.deliveredAt) patch.delivered_at = nowIso;
    if (input.newStatus === "delayed" || input.newStatus === "cancelled") patch.has_updated_explanation = input.reason.length > 0;
    const updated = unwrap(await db.from("milestones").update(patch).eq("id", milestone.id).select("*").single(), "milestone update");
    await db.from("projects").update({ last_verified_at: nowIso }).eq("id", milestone.projectId);
    await this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "milestone.status_change",
      targetType: "milestone",
      targetId: milestone.id,
      reason: input.reason,
      before: { status: milestone.status },
      after: { status: input.newStatus },
    });
    const feedTypes: FeedEventType[] = ["shipped", "partially_shipped", "delayed", "no_evidence", "cancelled"];
    if (feedTypes.includes(input.newStatus as FeedEventType)) {
      const project = await this.getProjectById(milestone.projectId);
      const ev = input.evidenceIds[0] ? await this.getEvidence(input.evidenceIds[0]) : null;
      await this.feed({
        type: input.newStatus as FeedEventType,
        projectId: milestone.projectId,
        milestoneId: milestone.id,
        evidenceId: ev?.id ?? null,
        title: `${project?.name ?? "Project"}: “${milestone.title}” — ${STATUS_LABELS[input.newStatus]}`,
        summary: input.reason,
        sourceUrl: ev?.url ?? milestone.sourceUrl,
        occurredAt: nowIso,
        verified: true,
      });
    }
    return { milestone: mapMilestone(updated), event: mapStatusEvent(eventRow) };
  }

  async resolveDispute(input: ResolveDisputeInput): Promise<Dispute> {
    const db = await this.writer();
    const existing = await this.getDispute(input.disputeId);
    if (!existing) throw new Error("Dispute not found");
    const nowIso = new Date().toISOString();
    const patch: Row = { state: input.state, resolution: input.resolution };
    if (input.state === "resolved" || input.state === "rejected") {
      patch.resolved_by_id = input.actor.id;
      patch.resolved_at = nowIso;
    }
    const updated = unwrap(await db.from("disputes").update(patch).eq("id", input.disputeId).select("*").single(), "dispute update");
    await this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "dispute.resolve",
      targetType: "dispute",
      targetId: input.disputeId,
      reason: input.resolution,
      before: { state: existing.state },
      after: { state: input.state },
    });
    const dispute = mapDispute(updated);
    if (input.state === "resolved") {
      const project = await this.getProjectById(dispute.projectId);
      const milestone = dispute.milestoneId ? await this.getMilestone(dispute.milestoneId) : null;
      await this.feed({
        type: "dispute_resolved",
        projectId: dispute.projectId,
        milestoneId: dispute.milestoneId,
        evidenceId: dispute.evidenceId,
        title: `${project?.name ?? "Project"}: ${dispute.kind} resolved${milestone ? ` on “${milestone.title}”` : ""}`,
        summary: input.resolution,
        sourceUrl: dispute.sourceUrl ?? milestone?.sourceUrl ?? project?.officialUrl ?? "",
        occurredAt: nowIso,
        verified: true,
      });
    }
    return dispute;
  }

  async upsertProject(input: ProjectUpsertInput): Promise<Project> {
    const db = await this.writer();
    const payload = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      category: input.category,
      ecosystem: input.ecosystem,
      official_url: input.officialUrl,
      status: input.status,
    };
    if (input.id) {
      const before = await this.getProjectById(input.id);
      unwrap(await db.from("projects").update(payload).eq("id", input.id).select("*").single(), "project update");
      await this.audit({
        actorId: input.actor.id,
        actorName: input.actor.displayName,
        action: "project.update",
        targetType: "project",
        targetId: input.id,
        reason: "Project details edited in admin.",
        before: before ? { name: before.name, slug: before.slug, status: before.status } : null,
        after: { name: input.name, slug: input.slug, status: input.status },
      });
      return (await this.getProjectById(input.id))!;
    }
    const inserted = unwrap(await db.from("projects").insert(payload).select("*").single(), "project insert");
    await db.from("project_links").insert({ project_id: inserted.id, label: "Website", url: input.officialUrl, kind: "website" });
    await this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "project.create",
      targetType: "project",
      targetId: inserted.id,
      reason: "Project created in admin.",
      before: null,
      after: { name: input.name, slug: input.slug, status: input.status },
    });
    return (await this.getProjectById(inserted.id))!;
  }

  async createMilestone(input: MilestoneCreateInput): Promise<Milestone> {
    const db = await this.writer();
    const nowIso = new Date().toISOString();
    const inserted = unwrap(
      await db
        .from("milestones")
        .insert({
          project_id: input.projectId,
          title: input.title,
          commitment_paraphrase: input.commitmentParaphrase,
          source_url: input.sourceUrl,
          source_accessed_at: nowIso,
          claim_date: input.claimDate,
          deadline: input.deadline,
          original_deadline: input.deadline,
          importance: input.importance,
          status: "planned",
          moderator_approved: false,
        })
        .select("*")
        .single(),
      "milestone insert",
    );
    const milestone = mapMilestone(inserted);
    await db.from("milestone_status_events").insert({
      milestone_id: milestone.id,
      project_id: milestone.projectId,
      actor_id: input.actor.id,
      actor_name: input.actor.displayName,
      actor_kind: "moderator",
      prior_status: null,
      new_status: "planned",
      reason: `Commitment recorded from cited source, accessed ${nowIso.slice(0, 10)}.`,
      evidence_ids: [],
    });
    const project = await this.getProjectById(input.projectId);
    await this.feed({
      type: "new_commitment",
      projectId: input.projectId,
      milestoneId: milestone.id,
      evidenceId: null,
      title: `${project?.name ?? "Project"}: new commitment “${milestone.title}”`,
      summary: `${milestone.commitmentParaphrase} Deadline ${milestone.deadline}.`,
      sourceUrl: milestone.sourceUrl,
      occurredAt: nowIso,
      verified: true,
    });
    await this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "milestone.create",
      targetType: "milestone",
      targetId: milestone.id,
      reason: "Milestone created from cited source.",
      before: null,
      after: { title: milestone.title, deadline: milestone.deadline, importance: milestone.importance },
    });
    return milestone;
  }

  async setMilestoneApproval(milestoneId: string, approved: boolean, reason: string, actor: SessionUser): Promise<Milestone> {
    const db = await this.writer();
    const before = await this.getMilestone(milestoneId);
    if (!before) throw new Error("Milestone not found");
    const updated = unwrap(await db.from("milestones").update({ moderator_approved: approved }).eq("id", milestoneId).select("*").single(), "approval update");
    await this.audit({
      actorId: actor.id,
      actorName: actor.displayName,
      action: "milestone.approval",
      targetType: "milestone",
      targetId: milestoneId,
      reason,
      before: { moderatorApproved: before.moderatorApproved },
      after: { moderatorApproved: approved },
    });
    return mapMilestone(updated);
  }

  async recordScoreSnapshot(snapshot: Omit<ShipScoreSnapshot, "id">, actor: SessionUser | null): Promise<ShipScoreSnapshot> {
    const db = await this.writer();
    const inserted = unwrap(
      await db
        .from("ship_score_snapshots")
        .insert({
          project_id: snapshot.projectId,
          total: snapshot.total,
          components: snapshot.components,
          confidence: snapshot.confidence,
          data_completeness: snapshot.dataCompleteness,
          formula_version: snapshot.formulaVersion,
          insufficient_data: snapshot.insufficientData,
          insufficient_reasons: snapshot.insufficientReasons,
          explanation: snapshot.explanation,
          calculated_at: snapshot.calculatedAt,
        })
        .select("*")
        .single(),
      "score insert",
    );
    await db.from("projects").update({ data_completeness: snapshot.dataCompleteness }).eq("id", snapshot.projectId);
    if (actor) {
      await this.audit({
        actorId: actor.id,
        actorName: actor.displayName,
        action: "score.recalculate",
        targetType: "project",
        targetId: snapshot.projectId,
        reason: `Recalculated with formula ${snapshot.formulaVersion}.`,
        before: null,
        after: { total: snapshot.total, formulaVersion: snapshot.formulaVersion },
      });
    }
    return mapScore(inserted);
  }

  async toggleWatchlistItem(userId: string, projectId: string): Promise<{ watching: boolean }> {
    const db = await this.writer();
    const { watchlist, items } = (await this.getWatchlistForUser(userId))!;
    const existing = items.find((i) => i.projectId === projectId);
    if (existing) {
      await db.from("watchlist_items").delete().eq("id", existing.id);
      return { watching: false };
    }
    await db.from("watchlist_items").insert({ watchlist_id: watchlist.id, project_id: projectId });
    return { watching: true };
  }

  async setWatchlistVisibility(userId: string, isPublic: boolean): Promise<void> {
    const db = await this.writer();
    await db.from("watchlists").update({ is_public: isPublic }).eq("user_id", userId).eq("name", "Following");
    await db.from("profiles").update({ watchlist_public: isPublic }).eq("id", userId);
  }

  async recordGithubSnapshot(snapshot: Omit<GithubSnapshot, "id">): Promise<{ snapshot: GithubSnapshot; created: boolean }> {
    const db = await this.writer();
    const day = snapshot.retrievedAt.slice(0, 10);
    const { data: existing } = await db.from("github_snapshots").select("*").eq("repository_id", snapshot.repositoryId).eq("retrieved_day", day).maybeSingle();
    if (existing) return { snapshot: mapGithubSnapshot(existing), created: false };
    const inserted = unwrap(
      await db
        .from("github_snapshots")
        .insert({
          repository_id: snapshot.repositoryId,
          project_id: snapshot.projectId,
          default_branch: snapshot.defaultBranch,
          stars: snapshot.stars,
          open_issues: snapshot.openIssues,
          latest_release_tag: snapshot.latestReleaseTag,
          latest_release_at: snapshot.latestReleaseAt,
          releases_last_90d: snapshot.releasesLast90d,
          tags_last_90d: snapshot.tagsLast90d,
          active_weeks_last_12: snapshot.activeWeeksLast12,
          last_push_at: snapshot.lastPushAt,
          source: snapshot.source,
          retrieved_at: snapshot.retrievedAt,
        })
        .select("*")
        .single(),
      "github snapshot insert",
    );
    return { snapshot: mapGithubSnapshot(inserted), created: true };
  }

  async recordWebsiteCheck(check: Omit<WebsiteCheck, "id">): Promise<{ check: WebsiteCheck; created: boolean }> {
    const db = await this.writer();
    const bucket = Math.floor(new Date(check.checkedAt).getTime() / 600_000);
    const { data: existing } = await db.from("website_checks").select("*").eq("endpoint_id", check.endpointId).eq("checked_bucket", bucket).maybeSingle();
    if (existing) return { check: mapCheck(existing), created: false };
    const inserted = unwrap(
      await db
        .from("website_checks")
        .insert({
          endpoint_id: check.endpointId,
          project_id: check.projectId,
          http_status: check.httpStatus,
          ok: check.ok,
          latency_ms: check.latencyMs,
          error: check.error,
          checked_at: check.checkedAt,
        })
        .select("*")
        .single(),
      "website check insert",
    );
    return { check: mapCheck(inserted), created: true };
  }

  async voteEvidence(evidenceId: string, vote: "support" | "challenge", userId: string): Promise<Evidence> {
    const db = await this.writer();
    await db.from("evidence_votes").upsert({ evidence_id: evidenceId, user_id: userId, vote });
    const votes = unwrap(await db.from("evidence_votes").select("vote").eq("evidence_id", evidenceId), "votes");
    const support = votes.filter((v: Row) => v.vote === "support").length;
    const challenge = votes.filter((v: Row) => v.vote === "challenge").length;
    const updated = unwrap(await db.from("evidence").update({ support_count: support, challenge_count: challenge }).eq("id", evidenceId).select("*").single(), "vote update");
    return mapEvidence(updated);
  }
}

// Keep `auditIdFor` referenced for parity with Demo Mode identifiers in tooling.
export { auditIdFor };

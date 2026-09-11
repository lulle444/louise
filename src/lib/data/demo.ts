import { auditIdFor, buildDemoDataset, type DemoDataset } from "@/lib/demo/seed";
import { STATUS_LABELS } from "@/lib/domain/status";
import type {
  AdminAuditEntry,
  Dispute,
  Evidence,
  FeedEvent,
  FeedEventType,
  GithubSnapshot,
  Milestone,
  MilestoneStatusEvent,
  Project,
  SessionUser,
  ShipScoreSnapshot,
  WebsiteCheck,
} from "@/lib/domain/types";
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
import { buildSummary, filterAndSortSummaries } from "./summaries";

type GlobalWithStore = typeof globalThis & { __shiptraceDemoStore?: DemoDataset };

/** Process-wide mutable demo store (survives HMR in development). */
export function getDemoStore(): DemoDataset {
  const g = globalThis as GlobalWithStore;
  if (!g.__shiptraceDemoStore) g.__shiptraceDemoStore = buildDemoDataset();
  return g.__shiptraceDemoStore;
}

/** Reset the demo store (used by tests). */
export function resetDemoStore(now?: Date): DemoDataset {
  const g = globalThis as GlobalWithStore;
  g.__shiptraceDemoStore = buildDemoDataset(now);
  return g.__shiptraceDemoStore;
}

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

const DAY = 86_400_000;

export class DemoDataSource implements DataSource {
  readonly mode = "demo" as const;
  constructor(private readonly store: DemoDataset = getDemoStore()) {}

  private latestScoreSync(projectId: string): ShipScoreSnapshot | null {
    const list = this.store.scoreSnapshots.filter((s) => s.projectId === projectId);
    return list.length ? list.reduce((a, b) => (a.calculatedAt > b.calculatedAt ? a : b)) : null;
  }

  private summarise(project: Project, now: Date): ProjectSummary {
    const id = project.id;
    return buildSummary(
      {
        project,
        milestones: this.store.milestones.filter((m) => m.projectId === id),
        score: this.latestScoreSync(id),
        evidence: this.store.evidence.filter((e) => e.projectId === id),
        githubSnapshots: this.store.githubSnapshots.filter((s) => s.projectId === id),
        websiteChecks: this.store.websiteChecks.filter((c) => c.projectId === id),
      },
      now,
    );
  }

  async listProjectSummaries(filters: ProjectFilters = {}): Promise<ProjectSummary[]> {
    const now = new Date();
    const summaries = this.store.projects.map((p) => this.summarise(p, now));
    const byProject = new Map<string, Milestone[]>();
    for (const m of this.store.milestones) byProject.set(m.projectId, [...(byProject.get(m.projectId) ?? []), m]);
    return filterAndSortSummaries(summaries, byProject, filters, now);
  }

  async getProjectBySlug(slug: string): Promise<Project | null> {
    return this.store.projects.find((p) => p.slug === slug) ?? null;
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.store.projects.find((p) => p.id === id) ?? null;
  }

  async getProjectBundle(slug: string): Promise<ProjectBundle | null> {
    const project = await this.getProjectBySlug(slug);
    if (!project) return null;
    const id = project.id;
    const scoreHistory = this.store.scoreSnapshots.filter((s) => s.projectId === id).sort((a, b) => a.calculatedAt.localeCompare(b.calculatedAt));
    return {
      project,
      milestones: this.store.milestones.filter((m) => m.projectId === id).sort((a, b) => a.deadline.localeCompare(b.deadline)),
      statusEvents: this.store.statusEvents.filter((e) => e.projectId === id),
      evidence: this.store.evidence.filter((e) => e.projectId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      disputes: this.store.disputes.filter((d) => d.projectId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      scoreHistory,
      latestScore: scoreHistory.at(-1) ?? null,
      githubRepositories: this.store.githubRepositories.filter((r) => r.projectId === id),
      githubSnapshots: this.store.githubSnapshots.filter((s) => s.projectId === id).sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt)),
      endpoints: this.store.endpoints.filter((e) => e.projectId === id),
      websiteChecks: this.store.websiteChecks.filter((c) => c.projectId === id).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt)),
      feedEvents: this.store.feedEvents.filter((f) => f.projectId === id),
    };
  }

  async listMilestones(filter: MilestoneFilter = {}): Promise<Milestone[]> {
    return this.store.milestones
      .filter((m) => !filter.projectId || m.projectId === filter.projectId)
      .filter((m) => !filter.status || m.status === filter.status)
      .filter((m) => !filter.dueAfter || m.deadline >= filter.dueAfter)
      .filter((m) => !filter.dueBefore || m.deadline <= filter.dueBefore)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  async getMilestone(id: string): Promise<Milestone | null> {
    return this.store.milestones.find((m) => m.id === id) ?? null;
  }

  async listStatusEvents(milestoneId: string): Promise<MilestoneStatusEvent[]> {
    return this.store.statusEvents.filter((e) => e.milestoneId === milestoneId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listEvidence(filter: EvidenceFilter = {}): Promise<Evidence[]> {
    const list = this.store.evidence
      .filter((e) => !filter.projectId || e.projectId === filter.projectId)
      .filter((e) => !filter.milestoneId || e.milestoneId === filter.milestoneId)
      .filter((e) => !filter.reviewState || e.reviewState === filter.reviewState)
      .filter((e) => !filter.submitterId || e.submitterId === filter.submitterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filter.limit ? list.slice(0, filter.limit) : list;
  }

  async getEvidence(id: string): Promise<Evidence | null> {
    return this.store.evidence.find((e) => e.id === id) ?? null;
  }

  async listDisputes(filter: DisputeFilter = {}): Promise<Dispute[]> {
    return this.store.disputes
      .filter((d) => !filter.projectId || d.projectId === filter.projectId)
      .filter((d) => !filter.milestoneId || d.milestoneId === filter.milestoneId)
      .filter((d) => !filter.state || d.state === filter.state)
      .filter((d) => !filter.submitterId || d.submitterId === filter.submitterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getDispute(id: string): Promise<Dispute | null> {
    return this.store.disputes.find((d) => d.id === id) ?? null;
  }

  async listScoreHistory(projectId: string): Promise<ShipScoreSnapshot[]> {
    return this.store.scoreSnapshots.filter((s) => s.projectId === projectId).sort((a, b) => a.calculatedAt.localeCompare(b.calculatedAt));
  }

  async getLatestScore(projectId: string): Promise<ShipScoreSnapshot | null> {
    return this.latestScoreSync(projectId);
  }

  async listFeedEvents(filter: FeedFilter = {}): Promise<FeedEvent[]> {
    const list = this.store.feedEvents
      .filter((f) => !filter.projectId || f.projectId === filter.projectId)
      .filter((f) => !filter.types?.length || filter.types.includes(f.type))
      .filter((f) => !filter.verifiedOnly || f.verified)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return filter.limit ? list.slice(0, filter.limit) : list;
  }

  async getProfileByUsername(username: string) {
    return this.store.profiles.find((p) => p.username === username) ?? null;
  }

  async getProfileById(id: string) {
    return this.store.profiles.find((p) => p.id === id) ?? null;
  }

  async listUserBadges(userId: string) {
    const ids = this.store.userBadges.filter((ub) => ub.userId === userId).map((ub) => ub.badgeId);
    return this.store.badges.filter((b) => ids.includes(b.id));
  }

  async getWatchlistForUser(userId: string) {
    let watchlist = this.store.watchlists.find((w) => w.userId === userId);
    if (!watchlist) {
      const profile = await this.getProfileById(userId);
      watchlist = { id: `wl_${userId}`, userId, name: "Following", isPublic: profile?.watchlistPublic ?? false };
      this.store.watchlists.push(watchlist);
    }
    const items = this.store.watchlistItems.filter((i) => i.watchlistId === watchlist!.id).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    return { watchlist, items };
  }

  async listAdminAudit(limit = 50): Promise<AdminAuditEntry[]> {
    return [...this.store.adminAudit].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async listGithubRepositories(projectId?: string) {
    return this.store.githubRepositories.filter((r) => !projectId || r.projectId === projectId);
  }

  async listGithubSnapshots(projectId: string) {
    return this.store.githubSnapshots.filter((s) => s.projectId === projectId).sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt));
  }

  async listWebsiteEndpoints(projectId?: string) {
    return this.store.endpoints.filter((e) => !projectId || e.projectId === projectId);
  }

  async listWebsiteChecks(projectId: string) {
    return this.store.websiteChecks.filter((c) => c.projectId === projectId).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
  }

  async listProjectSuggestions() {
    return [...this.store.projectSuggestions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getIntegrationStatus(): Promise<IntegrationStatus> {
    const gh = this.store.githubSnapshots;
    const checks = this.store.websiteChecks;
    const scores = this.store.scoreSnapshots;
    const recent = checks.filter((c) => new Date(c.checkedAt).getTime() > Date.now() - 7 * DAY);
    const lastScore = scores.length ? scores.reduce((a, b) => (a.calculatedAt > b.calculatedAt ? a : b)) : null;
    return {
      github: {
        configured: false,
        repositories: this.store.githubRepositories.length,
        lastRetrievedAt: gh.length ? gh.reduce((a, b) => (a.retrievedAt > b.retrievedAt ? a : b)).retrievedAt : null,
        failures: 0,
      },
      website: {
        configured: false,
        endpoints: this.store.endpoints.length,
        lastCheckedAt: checks.length ? checks.reduce((a, b) => (a.checkedAt > b.checkedAt ? a : b)).checkedAt : null,
        recentFailures: recent.filter((c) => !c.ok).length,
      },
      scores: { lastCalculatedAt: lastScore?.calculatedAt ?? null, formulaVersion: lastScore?.formulaVersion ?? null },
    };
  }

  async getStats(): Promise<Stats> {
    return {
      projects: this.store.projects.filter((p) => p.status === "published").length,
      milestones: this.store.milestones.length,
      acceptedEvidence: this.store.evidence.filter((e) => e.reviewState === "accepted").length,
      pendingEvidence: this.store.evidence.filter((e) => e.reviewState === "pending").length,
      openDisputes: this.store.disputes.filter((d) => d.state === "open" || d.state === "under_review").length,
      contributors: this.store.profiles.length,
    };
  }

  // ---------------------------------------------------------------- writes

  private audit(entry: Omit<AdminAuditEntry, "id" | "createdAt">) {
    this.store.adminAudit.unshift({ ...entry, id: newId("audit"), createdAt: new Date().toISOString() });
  }

  private feed(event: Omit<FeedEvent, "id">) {
    this.store.feedEvents.unshift({ ...event, id: newId("feed") });
  }

  async createEvidence(input: NewEvidenceInput): Promise<Evidence> {
    const id = newId("ev");
    const nowIso = new Date().toISOString();
    const rec: Evidence = {
      id,
      projectId: input.projectId,
      milestoneId: input.milestoneId,
      url: input.url,
      type: input.type,
      title: input.title,
      summary: input.summary,
      publishedAt: input.publishedAt,
      accessedAt: nowIso,
      submitterId: input.submitter.id,
      submitterName: input.submitter.displayName,
      submitterKind: "community",
      reviewState: "pending",
      reviewReason: null,
      reviewedById: null,
      reviewedAt: null,
      supportCount: 0,
      challengeCount: 0,
      conflictOfInterest: input.conflictOfInterest,
      createdAt: nowIso,
      auditId: auditIdFor(id),
    };
    this.store.evidence.unshift(rec);
    // Community submissions move a planned/in-progress milestone to "submitted_for_review" via automated intake.
    const milestone = this.store.milestones.find((m) => m.id === input.milestoneId);
    if (milestone && (milestone.status === "planned" || milestone.status === "in_progress")) {
      const event: MilestoneStatusEvent = {
        id: newId("sev"),
        milestoneId: milestone.id,
        projectId: milestone.projectId,
        actorId: "system",
        actorName: "SHIPTRACE automated intake",
        actorKind: "automated",
        priorStatus: milestone.status,
        newStatus: "submitted_for_review",
        reason: "Community evidence submitted; pending moderator review. Verified status is unchanged until a moderator decides.",
        evidenceIds: [id],
        createdAt: nowIso,
        auditId: auditIdFor(`${id}-intake`),
      };
      this.store.statusEvents.push(event);
      milestone.status = "submitted_for_review";
      milestone.updatedAt = nowIso;
    }
    return rec;
  }

  async createDispute(input: NewDisputeInput): Promise<Dispute> {
    const rec: Dispute = {
      id: newId("dsp"),
      projectId: input.projectId,
      milestoneId: input.milestoneId,
      evidenceId: input.evidenceId,
      kind: input.kind,
      submitterId: input.submitter.id,
      submitterName: input.submitter.displayName,
      submitterKind: "community",
      claim: input.claim,
      sourceUrl: input.sourceUrl,
      state: "open",
      resolution: null,
      resolvedById: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.store.disputes.unshift(rec);
    return rec;
  }

  async createProjectSuggestion(input: NewProjectSuggestionInput): Promise<ProjectSuggestion> {
    const rec: ProjectSuggestion = {
      id: newId("sug"),
      name: input.name,
      officialUrl: input.officialUrl,
      category: input.category,
      ecosystem: input.ecosystem,
      description: input.description,
      roadmapUrl: input.roadmapUrl,
      submitterId: input.submitter.id,
      submitterName: input.submitter.displayName,
      state: "pending",
      createdAt: new Date().toISOString(),
    };
    this.store.projectSuggestions.unshift(rec);
    return rec;
  }

  async reviewEvidence(input: ReviewEvidenceInput): Promise<Evidence> {
    const rec = this.store.evidence.find((e) => e.id === input.evidenceId);
    if (!rec) throw new Error("Evidence not found");
    const before = rec.reviewState;
    const nowIso = new Date().toISOString();
    rec.reviewState = input.decision;
    rec.reviewReason = input.reason;
    rec.reviewedById = input.reviewer.id;
    rec.reviewedAt = nowIso;
    this.audit({
      actorId: input.reviewer.id,
      actorName: input.reviewer.displayName,
      action: "evidence.review",
      targetType: "evidence",
      targetId: rec.id,
      reason: input.reason,
      before: { reviewState: before },
      after: { reviewState: input.decision },
    });
    if (input.decision === "accepted") {
      const project = this.store.projects.find((p) => p.id === rec.projectId);
      const milestone = this.store.milestones.find((m) => m.id === rec.milestoneId);
      this.feed({
        type: "evidence_added",
        projectId: rec.projectId,
        milestoneId: rec.milestoneId,
        evidenceId: rec.id,
        title: `${project?.name ?? "Project"}: evidence accepted${milestone ? ` for “${milestone.title}”` : ""}`,
        summary: `${rec.title} — verified from public evidence.`,
        sourceUrl: rec.url,
        occurredAt: nowIso,
        verified: true,
      });
      const profile = this.store.profiles.find((p) => p.id === rec.submitterId);
      if (profile) profile.acceptedEvidenceCount += 1;
    }
    return rec;
  }

  async changeMilestoneStatus(input: StatusChangeInput) {
    const milestone = this.store.milestones.find((m) => m.id === input.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    const nowIso = new Date().toISOString();
    const prior = milestone.status;
    const eventId = newId("sev");
    const event: MilestoneStatusEvent = {
      id: eventId,
      milestoneId: milestone.id,
      projectId: milestone.projectId,
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      actorKind: input.actorKind ?? "moderator",
      priorStatus: prior,
      newStatus: input.newStatus,
      reason: input.reason,
      evidenceIds: input.evidenceIds,
      createdAt: nowIso,
      auditId: auditIdFor(eventId),
    };
    this.store.statusEvents.push(event);
    milestone.status = input.newStatus;
    milestone.updatedAt = nowIso;
    if (input.newStatus === "shipped" || input.newStatus === "partially_shipped") milestone.deliveredAt = milestone.deliveredAt ?? nowIso;
    if (input.newStatus === "delayed" || input.newStatus === "cancelled") milestone.hasUpdatedExplanation = input.reason.length > 0;
    this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "milestone.status_change",
      targetType: "milestone",
      targetId: milestone.id,
      reason: input.reason,
      before: { status: prior },
      after: { status: input.newStatus },
    });
    const project = this.store.projects.find((p) => p.id === milestone.projectId);
    const feedTypes: FeedEventType[] = ["shipped", "partially_shipped", "delayed", "no_evidence", "cancelled"];
    if (feedTypes.includes(input.newStatus as FeedEventType)) {
      const ev = input.evidenceIds[0] ? this.store.evidence.find((e) => e.id === input.evidenceIds[0]) : null;
      this.feed({
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
    if (project) project.lastVerifiedAt = nowIso;
    return { milestone, event };
  }

  async resolveDispute(input: ResolveDisputeInput): Promise<Dispute> {
    const rec = this.store.disputes.find((d) => d.id === input.disputeId);
    if (!rec) throw new Error("Dispute not found");
    const before = rec.state;
    const nowIso = new Date().toISOString();
    rec.state = input.state;
    rec.resolution = input.resolution;
    if (input.state === "resolved" || input.state === "rejected") {
      rec.resolvedById = input.actor.id;
      rec.resolvedAt = nowIso;
    }
    this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "dispute.resolve",
      targetType: "dispute",
      targetId: rec.id,
      reason: input.resolution,
      before: { state: before },
      after: { state: input.state },
    });
    if (input.state === "resolved") {
      const project = this.store.projects.find((p) => p.id === rec.projectId);
      const milestone = rec.milestoneId ? this.store.milestones.find((m) => m.id === rec.milestoneId) : null;
      this.feed({
        type: "dispute_resolved",
        projectId: rec.projectId,
        milestoneId: rec.milestoneId,
        evidenceId: rec.evidenceId,
        title: `${project?.name ?? "Project"}: ${rec.kind} resolved${milestone ? ` on “${milestone.title}”` : ""}`,
        summary: input.resolution,
        sourceUrl: rec.sourceUrl ?? milestone?.sourceUrl ?? project?.officialUrl ?? "",
        occurredAt: nowIso,
        verified: true,
      });
      const profile = this.store.profiles.find((p) => p.id === rec.submitterId);
      if (profile) profile.helpfulCorrectionsCount += 1;
    }
    return rec;
  }

  async upsertProject(input: ProjectUpsertInput): Promise<Project> {
    const nowIso = new Date().toISOString();
    const existing = input.id ? this.store.projects.find((p) => p.id === input.id) : undefined;
    if (existing) {
      const before = { ...existing };
      Object.assign(existing, {
        name: input.name,
        slug: input.slug,
        description: input.description,
        category: input.category,
        ecosystem: input.ecosystem,
        officialUrl: input.officialUrl,
        status: input.status,
        updatedAt: nowIso,
      });
      this.audit({
        actorId: input.actor.id,
        actorName: input.actor.displayName,
        action: "project.update",
        targetType: "project",
        targetId: existing.id,
        reason: "Project details edited in admin.",
        before: { name: before.name, slug: before.slug, status: before.status },
        after: { name: existing.name, slug: existing.slug, status: existing.status },
      });
      return existing;
    }
    if (this.store.projects.some((p) => p.slug === input.slug)) throw new Error("Slug already in use");
    const project: Project = {
      id: newId("proj"),
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      ecosystem: input.ecosystem,
      officialUrl: input.officialUrl,
      status: input.status,
      dataCompleteness: 0,
      lastVerifiedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      isDemo: true,
      links: [{ id: newId("link"), projectId: "", label: "Website", url: input.officialUrl, kind: "website" }],
      transparency: { datedRoadmapUpdates: 0, explanationRate: 0, hasPublicDocs: false, changeDisclosureRate: 0 },
    };
    project.links[0]!.projectId = project.id;
    this.store.projects.push(project);
    this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "project.create",
      targetType: "project",
      targetId: project.id,
      reason: "Project created in admin.",
      before: null,
      after: { name: project.name, slug: project.slug, status: project.status },
    });
    return project;
  }

  async createMilestone(input: MilestoneCreateInput): Promise<Milestone> {
    const nowIso = new Date().toISOString();
    const id = newId("ms");
    const milestone: Milestone = {
      id,
      projectId: input.projectId,
      title: input.title,
      commitmentParaphrase: input.commitmentParaphrase,
      sourceUrl: input.sourceUrl,
      sourceAccessedAt: nowIso,
      claimDate: input.claimDate,
      deadline: input.deadline,
      originalDeadline: input.deadline,
      importance: input.importance,
      status: "planned",
      moderatorApproved: false,
      moderatorNote: null,
      deliveredAt: null,
      hasUpdatedExplanation: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      auditId: auditIdFor(id),
    };
    this.store.milestones.push(milestone);
    const eventId = newId("sev");
    this.store.statusEvents.push({
      id: eventId,
      milestoneId: id,
      projectId: input.projectId,
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      actorKind: "moderator",
      priorStatus: null,
      newStatus: "planned",
      reason: `Commitment recorded from cited source, accessed ${nowIso.slice(0, 10)}.`,
      evidenceIds: [],
      createdAt: nowIso,
      auditId: auditIdFor(eventId),
    });
    const project = this.store.projects.find((p) => p.id === input.projectId);
    this.feed({
      type: "new_commitment",
      projectId: input.projectId,
      milestoneId: id,
      evidenceId: null,
      title: `${project?.name ?? "Project"}: new commitment “${milestone.title}”`,
      summary: `${milestone.commitmentParaphrase} Deadline ${milestone.deadline}.`,
      sourceUrl: milestone.sourceUrl,
      occurredAt: nowIso,
      verified: true,
    });
    this.audit({
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: "milestone.create",
      targetType: "milestone",
      targetId: id,
      reason: "Milestone created from cited source.",
      before: null,
      after: { title: milestone.title, deadline: milestone.deadline, importance: milestone.importance },
    });
    return milestone;
  }

  async setMilestoneApproval(milestoneId: string, approved: boolean, reason: string, actor: SessionUser): Promise<Milestone> {
    const milestone = this.store.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    const before = milestone.moderatorApproved;
    milestone.moderatorApproved = approved;
    milestone.updatedAt = new Date().toISOString();
    this.audit({
      actorId: actor.id,
      actorName: actor.displayName,
      action: "milestone.approval",
      targetType: "milestone",
      targetId: milestoneId,
      reason,
      before: { moderatorApproved: before },
      after: { moderatorApproved: approved },
    });
    return milestone;
  }

  async recordScoreSnapshot(snapshot: Omit<ShipScoreSnapshot, "id">, actor: SessionUser | null): Promise<ShipScoreSnapshot> {
    const rec: ShipScoreSnapshot = { ...snapshot, id: newId("score") };
    // Snapshots are append-only; historical rows are never rewritten.
    this.store.scoreSnapshots.push(rec);
    const project = this.store.projects.find((p) => p.id === rec.projectId);
    if (project) project.dataCompleteness = rec.dataCompleteness;
    if (actor) {
      this.audit({
        actorId: actor.id,
        actorName: actor.displayName,
        action: "score.recalculate",
        targetType: "project",
        targetId: rec.projectId,
        reason: `Recalculated with formula ${rec.formulaVersion}.`,
        before: null,
        after: { total: rec.total, formulaVersion: rec.formulaVersion },
      });
    }
    return rec;
  }

  async toggleWatchlistItem(userId: string, projectId: string) {
    const { watchlist, items } = (await this.getWatchlistForUser(userId))!;
    const existing = items.find((i) => i.projectId === projectId);
    if (existing) {
      this.store.watchlistItems = this.store.watchlistItems.filter((i) => i.id !== existing.id);
      return { watching: false };
    }
    this.store.watchlistItems.push({ id: newId("wli"), watchlistId: watchlist.id, projectId, addedAt: new Date().toISOString() });
    return { watching: true };
  }

  async setWatchlistVisibility(userId: string, isPublic: boolean) {
    const { watchlist } = (await this.getWatchlistForUser(userId))!;
    watchlist.isPublic = isPublic;
    const profile = this.store.profiles.find((p) => p.id === userId);
    if (profile) profile.watchlistPublic = isPublic;
  }

  async recordGithubSnapshot(snapshot: Omit<GithubSnapshot, "id">) {
    // Idempotent per repository per UTC day.
    const day = snapshot.retrievedAt.slice(0, 10);
    const existing = this.store.githubSnapshots.find((s) => s.repositoryId === snapshot.repositoryId && s.retrievedAt.slice(0, 10) === day);
    if (existing) return { snapshot: existing, created: false };
    const rec: GithubSnapshot = { ...snapshot, id: newId("ghs") };
    this.store.githubSnapshots.push(rec);
    return { snapshot: rec, created: true };
  }

  async recordWebsiteCheck(check: Omit<WebsiteCheck, "id">) {
    // Idempotent per endpoint per 10-minute bucket.
    const bucket = Math.floor(new Date(check.checkedAt).getTime() / 600_000);
    const existing = this.store.websiteChecks.find((c) => c.endpointId === check.endpointId && Math.floor(new Date(c.checkedAt).getTime() / 600_000) === bucket);
    if (existing) return { check: existing, created: false };
    const rec: WebsiteCheck = { ...check, id: newId("wchk") };
    this.store.websiteChecks.push(rec);
    return { check: rec, created: true };
  }

  async voteEvidence(evidenceId: string, vote: "support" | "challenge") {
    const rec = this.store.evidence.find((e) => e.id === evidenceId);
    if (!rec) throw new Error("Evidence not found");
    if (vote === "support") rec.supportCount += 1;
    else rec.challengeCount += 1;
    return rec;
  }
}

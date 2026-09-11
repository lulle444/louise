import { computeShipScore, FORMULA_V0_9, FORMULA_V1 } from "@/lib/domain/score";
import { STATUS_LABELS } from "@/lib/domain/status";
import type {
  AdminAuditEntry,
  Badge,
  Dispute,
  Evidence,
  FeedEvent,
  GithubRepository,
  GithubSnapshot,
  Milestone,
  MilestoneStatus,
  MilestoneStatusEvent,
  Profile,
  Project,
  ShipScoreSnapshot,
  UserBadge,
  Watchlist,
  WatchlistItem,
  WebsiteCheck,
  WebsiteEndpoint,
} from "@/lib/domain/types";
import type { ProjectSuggestion } from "@/lib/data/types";
import { DEMO_BADGES, DEMO_DISPUTES, DEMO_PROJECTS, DEMO_USERS, type EvidenceSpec, type MilestoneSpec, type ProjectSpec } from "./spec";

export interface DemoDataset {
  generatedAt: string;
  projects: Project[];
  milestones: Milestone[];
  statusEvents: MilestoneStatusEvent[];
  evidence: Evidence[];
  disputes: Dispute[];
  scoreSnapshots: ShipScoreSnapshot[];
  githubRepositories: GithubRepository[];
  githubSnapshots: GithubSnapshot[];
  endpoints: WebsiteEndpoint[];
  websiteChecks: WebsiteCheck[];
  feedEvents: FeedEvent[];
  profiles: Profile[];
  badges: Badge[];
  userBadges: UserBadge[];
  watchlists: Watchlist[];
  watchlistItems: WatchlistItem[];
  adminAudit: AdminAuditEntry[];
  projectSuggestions: ProjectSuggestion[];
}

const DAY = 86_400_000;

/** Deterministic PRNG (mulberry32) so demo observations are stable per seed. */
export function prng(seedText: string): () => number {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Short, stable public audit identifier derived from a record id. */
export function auditIdFor(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return `ST-${(h >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function iso(date: Date): string {
  return date.toISOString();
}
function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildDemoDataset(now: Date = defaultDemoNow()): DemoDataset {
  const at = (days: number, hour = 10) => {
    const d = new Date(now.getTime() + days * DAY);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };
  const moderator = DEMO_USERS.find((u) => u.role === "moderator")!;
  const usersByName = new Map(DEMO_USERS.map((u) => [u.username, u]));

  const projects: Project[] = [];
  const milestones: Milestone[] = [];
  const statusEvents: MilestoneStatusEvent[] = [];
  const evidence: Evidence[] = [];
  const feedEvents: FeedEvent[] = [];
  const githubRepositories: GithubRepository[] = [];
  const githubSnapshots: GithubSnapshot[] = [];
  const endpoints: WebsiteEndpoint[] = [];
  const websiteChecks: WebsiteCheck[] = [];
  const adminAudit: AdminAuditEntry[] = [];
  const scoreSnapshots: ShipScoreSnapshot[] = [];
  const disputes: Dispute[] = [];

  const pushEvent = (e: Omit<MilestoneStatusEvent, "auditId">) => {
    statusEvents.push({ ...e, auditId: auditIdFor(e.id) });
  };
  const pushFeed = (e: Omit<FeedEvent, "id"> & { id: string }) => feedEvents.push(e);
  const pushAudit = (entry: Omit<AdminAuditEntry, "id"> & { id: string }) => adminAudit.push(entry);

  for (const spec of DEMO_PROJECTS) {
    const projectId = `proj_${spec.slug.replace(/-/g, "_")}`;
    const base = `https://${spec.domain}`;
    const project: Project = {
      id: projectId,
      slug: spec.slug,
      name: spec.name,
      description: spec.description,
      category: spec.category,
      ecosystem: spec.ecosystem,
      officialUrl: `${base}/`,
      status: "published",
      dataCompleteness: 0,
      lastVerifiedAt: iso(at(-spec.lastVerifiedDaysAgo, 9)),
      createdAt: iso(at(-Math.max(...spec.milestones.map((m) => m.claimDaysAgo)) - 5, 8)),
      updatedAt: iso(at(-spec.lastVerifiedDaysAgo, 9)),
      isDemo: true,
      links: spec.links.map((l, i) => ({ id: `link_${spec.slug}_${i}`, projectId, label: l.label, url: `${base}${l.path}`, kind: l.kind })),
      transparency: spec.transparency,
    };
    projects.push(project);

    // Milestones
    for (const ms of spec.milestones) {
      const milestoneId = `ms_${spec.slug.replace(/-/g, "_")}_${ms.key.replace(/-/g, "_")}`;
      const claimDate = at(-ms.claimDaysAgo, 9);
      const deadline = at(ms.deadlineInDays, 23);
      const originalDeadline = ms.originalDeadlineInDays !== undefined ? at(ms.originalDeadlineInDays, 23) : deadline;
      const delivered = ms.deliveredInDays !== undefined ? at(ms.deliveredInDays, 15) : null;
      const record: Milestone = {
        id: milestoneId,
        projectId,
        title: ms.title,
        commitmentParaphrase: ms.paraphrase,
        sourceUrl: `${base}${ms.sourcePath}`,
        sourceAccessedAt: iso(at(-ms.claimDaysAgo + 1, 11)),
        claimDate: dateOnly(claimDate),
        deadline: dateOnly(deadline),
        originalDeadline: dateOnly(originalDeadline),
        importance: ms.importance,
        status: ms.status,
        moderatorApproved: ms.approved ?? true,
        moderatorNote: ms.moderatorNote ?? null,
        deliveredAt: delivered ? iso(delivered) : null,
        hasUpdatedExplanation: ms.hasUpdatedExplanation ?? false,
        createdAt: iso(at(-ms.claimDaysAgo + 1, 11)),
        updatedAt: iso(at(-ms.claimDaysAgo + 1, 11)),
        auditId: auditIdFor(milestoneId),
      };

      // Evidence
      const evidenceIds: string[] = [];
      const evidenceSpecs = ms.evidence ?? [];
      evidenceSpecs.forEach((ev: EvidenceSpec, i) => {
        const evidenceId = `ev_${spec.slug.replace(/-/g, "_")}_${ms.key.replace(/-/g, "_")}_${i + 1}`;
        const submitter = ev.submitter ? usersByName.get(ev.submitter)! : moderator;
        const submitterKind = ev.submitterKind ?? "moderator";
        const reviewState = ev.reviewState ?? "accepted";
        const published = at(-ev.publishedDaysAgo, 12);
        const accessed = at(-ev.publishedDaysAgo + 1, 14);
        const rec: Evidence = {
          id: evidenceId,
          projectId,
          milestoneId,
          url: `${base}${ev.path}`,
          type: ev.type,
          title: ev.title,
          summary: ev.summary,
          publishedAt: dateOnly(published),
          accessedAt: iso(accessed),
          submitterId: submitter.id,
          submitterName: submitter.displayName,
          submitterKind,
          reviewState,
          reviewReason:
            ev.reviewReason ??
            (reviewState === "accepted" ? "Source is a public, dated record matching the commitment scope." : reviewState === "pending" ? null : null),
          reviewedById: reviewState === "pending" ? null : moderator.id,
          reviewedAt: reviewState === "pending" ? null : iso(at(-ev.publishedDaysAgo + 2, 16)),
          supportCount: ev.support ?? (reviewState === "accepted" ? 2 : 0),
          challengeCount: ev.challenge ?? 0,
          conflictOfInterest: ev.conflictOfInterest ?? null,
          createdAt: iso(accessed),
          auditId: auditIdFor(evidenceId),
        };
        evidence.push(rec);
        if (reviewState === "accepted") {
          evidenceIds.push(evidenceId);
          pushFeed({
            id: `feed_${evidenceId}`,
            type: "evidence_added",
            projectId,
            milestoneId,
            evidenceId,
            title: `${spec.name}: evidence accepted for “${ms.title}”`,
            summary: `${rec.title} — verified from public evidence.`,
            sourceUrl: rec.url,
            occurredAt: rec.reviewedAt!,
            verified: true,
          });
          pushAudit({
            id: `audit_review_${evidenceId}`,
            actorId: moderator.id,
            actorName: moderator.displayName,
            action: "evidence.review",
            targetType: "evidence",
            targetId: evidenceId,
            reason: rec.reviewReason ?? "",
            before: { reviewState: "pending" },
            after: { reviewState: "accepted" },
            createdAt: rec.reviewedAt!,
          });
        } else if (reviewState !== "pending") {
          pushAudit({
            id: `audit_review_${evidenceId}`,
            actorId: moderator.id,
            actorName: moderator.displayName,
            action: "evidence.review",
            targetType: "evidence",
            targetId: evidenceId,
            reason: rec.reviewReason ?? "",
            before: { reviewState: "pending" },
            after: { reviewState },
            createdAt: rec.reviewedAt!,
          });
        }
      });

      // Status history
      const seq: { status: MilestoneStatus; when: Date; reason: string; evidenceIds?: string[]; actorKind?: "moderator" | "automated" }[] = [];
      seq.push({ status: "planned", when: new Date(claimDate.getTime() + DAY), reason: `Commitment recorded from cited source (${spec.name} roadmap), accessed ${dateOnly(claimDate)}.` });
      const midpoint = new Date(claimDate.getTime() + Math.max(2, (deadline.getTime() - claimDate.getTime()) / DAY / 2) * DAY);
      const first = evidenceSpecs[0];
      const firstEvidenceDate = first ? at(-first.publishedDaysAgo + 1, 14) : null;
      switch (ms.status) {
        case "planned":
          break;
        case "in_progress":
          seq.push({ status: "in_progress", when: firstEvidenceDate ?? midpoint, reason: "Project published a dated progress update.", evidenceIds });
          break;
        case "submitted_for_review":
          seq.push({ status: "in_progress", when: midpoint, reason: "Project published a dated progress update." });
          seq.push({ status: "submitted_for_review", when: firstEvidenceDate ?? new Date(deadline.getTime() + DAY), reason: "Community evidence submitted; pending moderator review.", actorKind: "automated" });
          break;
        case "shipped":
        case "partially_shipped": {
          const d = delivered!;
          seq.push({ status: "in_progress", when: new Date(Math.min(midpoint.getTime(), d.getTime() - 3 * DAY)), reason: "Project published a dated progress update." });
          seq.push({ status: "submitted_for_review", when: new Date(d.getTime() - DAY), reason: "Evidence submitted for review.", actorKind: "automated" });
          seq.push({
            status: ms.status,
            when: d,
            reason: ms.status === "shipped" ? "Verified from public evidence: primary source matches the commitment scope." : `Verified from public evidence: partial scope delivered. ${ms.moderatorNote ?? ""}`.trim(),
            evidenceIds,
          });
          break;
        }
        case "delayed":
          seq.push({ status: "in_progress", when: midpoint, reason: "Project published a dated progress update." });
          seq.push({
            status: "delayed",
            when: new Date(originalDeadline.getTime() + DAY),
            reason: ms.hasUpdatedExplanation ? `Deadline passed; project published an updated timeline (new deadline ${dateOnly(deadline)}).` : "Deadline passed; no updated timeline has been published by the project.",
            evidenceIds,
          });
          break;
        case "no_evidence":
          seq.push({
            status: "no_evidence",
            when: new Date(deadline.getTime() + 3 * DAY),
            reason: `No qualifying evidence found as of ${dateOnly(new Date(deadline.getTime() + 3 * DAY))}.`,
          });
          break;
        case "cancelled":
          seq.push({
            status: "cancelled",
            when: firstEvidenceDate ?? new Date(deadline.getTime() + DAY),
            reason: ms.hasUpdatedExplanation ? "Project publicly withdrew the commitment with an explanation." : "Item removed from the public roadmap without a published explanation.",
            evidenceIds,
          });
          break;
        case "disputed":
          seq.push({ status: "in_progress", when: midpoint, reason: "Project published a dated progress update." });
          seq.push({ status: "submitted_for_review", when: new Date(deadline.getTime() - 3 * DAY), reason: "Evidence submitted for review.", actorKind: "automated" });
          seq.push({ status: "shipped", when: new Date(deadline.getTime() - 2 * DAY), reason: "Verified from official announcement.", evidenceIds: evidence.filter((e) => e.milestoneId === milestoneId).map((e) => e.id) });
          seq.push({ status: "disputed", when: at(-40, 12), reason: "Community dispute opened: feature availability may be limited to a beta cohort. Excluded from score pending resolution." });
          break;
      }
      if (ms.previouslyDisputed) {
        seq.push({ status: "disputed", when: at(-105, 12), reason: "Community dispute opened: council member list not public at time of verification." });
        seq.push({ status: ms.status, when: at(-98, 12), reason: "Dispute resolved: project published charter and member list. Prior decision preserved in history.", evidenceIds });
      }
      let prior: MilestoneStatus | null = null;
      seq.forEach((step, i) => {
        const eventId = `sev_${milestoneId}_${i + 1}`;
        const actorKind = step.actorKind ?? "moderator";
        pushEvent({
          id: eventId,
          milestoneId,
          projectId,
          actorId: actorKind === "automated" ? "system" : moderator.id,
          actorName: actorKind === "automated" ? "SHIPTRACE automated intake" : moderator.displayName,
          actorKind,
          priorStatus: prior,
          newStatus: step.status,
          reason: step.reason,
          evidenceIds: step.evidenceIds ?? [],
          createdAt: iso(step.when),
        });
        if (actorKind === "moderator" && i > 0) {
          pushAudit({
            id: `audit_${eventId}`,
            actorId: moderator.id,
            actorName: moderator.displayName,
            action: "milestone.status_change",
            targetType: "milestone",
            targetId: milestoneId,
            reason: step.reason,
            before: { status: prior },
            after: { status: step.status },
            createdAt: iso(step.when),
          });
        }
        prior = step.status;
        record.updatedAt = iso(step.when);
      });

      // Feed events
      pushFeed({
        id: `feed_new_${milestoneId}`,
        type: "new_commitment",
        projectId,
        milestoneId,
        evidenceId: null,
        title: `${spec.name}: new commitment “${ms.title}”`,
        summary: `${ms.paraphrase} Deadline ${dateOnly(originalDeadline)}.`,
        sourceUrl: record.sourceUrl,
        occurredAt: iso(new Date(claimDate.getTime() + DAY)),
        verified: true,
      });
      if (ms.originalDeadlineInDays !== undefined) {
        pushFeed({
          id: `feed_deadline_${milestoneId}`,
          type: "deadline_changed",
          projectId,
          milestoneId,
          evidenceId: null,
          title: `${spec.name}: deadline changed for “${ms.title}”`,
          summary: `Deadline moved from ${dateOnly(originalDeadline)} to ${dateOnly(deadline)} with a published explanation.`,
          sourceUrl: evidenceSpecs[0] ? `${base}${evidenceSpecs[0].path}` : record.sourceUrl,
          occurredAt: iso(new Date(originalDeadline.getTime() + DAY)),
          verified: true,
        });
      }
      const finalStep = seq[seq.length - 1];
      const feedType =
        ms.status === "shipped" || ms.status === "partially_shipped" || ms.status === "delayed" || ms.status === "no_evidence" || ms.status === "cancelled"
          ? ms.status
          : null;
      if (feedType && finalStep) {
        pushFeed({
          id: `feed_status_${milestoneId}`,
          type: feedType,
          projectId,
          milestoneId,
          evidenceId: evidenceIds[0] ?? null,
          title: `${spec.name}: “${ms.title}” — ${STATUS_LABELS[ms.status]}`,
          summary: finalStep.reason,
          sourceUrl: evidenceIds[0] ? evidence.find((e) => e.id === evidenceIds[0])!.url : record.sourceUrl,
          occurredAt: finalStep.status === ms.status ? iso(finalStep.when) : iso(delivered ?? finalStep.when),
          verified: true,
        });
      }
      milestones.push(record);
    }

    // GitHub
    if (spec.github) {
      const repoId = `gh_${spec.slug.replace(/-/g, "_")}`;
      githubRepositories.push({ id: repoId, projectId, owner: spec.github.owner, repo: spec.github.repo, url: `${base}/repo`, isPrimary: true });
      const rand = prng(`gh:${spec.slug}`);
      for (let week = 11; week >= 0; week--) {
        const retrievedAt = at(-week * 7 - 0.2, 6);
        const jitter = Math.round((rand() - 0.5) * 2);
        githubSnapshots.push({
          id: `ghs_${spec.slug.replace(/-/g, "_")}_${week}`,
          repositoryId: repoId,
          projectId,
          defaultBranch: "main",
          stars: Math.max(0, spec.github.stars - week * Math.round(spec.github.stars * 0.01)),
          openIssues: 12 + Math.round(rand() * 20),
          latestReleaseTag: spec.github.latestTag,
          latestReleaseAt: iso(at(-Math.max(spec.github.lastPushDaysAgo, 7) - week * 7, 12)),
          releasesLast90d: Math.max(0, spec.github.releases90d + (week > 6 ? jitter : 0)),
          tagsLast90d: spec.github.tags90d,
          activeWeeksLast12: Math.max(0, Math.min(12, spec.github.activeWeeks + (week > 6 ? jitter : 0))),
          lastPushAt: iso(at(-spec.github.lastPushDaysAgo - (week > 0 ? week * 7 : 0), 12)),
          source: "demo",
          retrievedAt: iso(retrievedAt),
        });
      }
    }

    // Website endpoints and checks
    spec.endpoints.forEach((ep, i) => {
      const endpointId = `wep_${spec.slug.replace(/-/g, "_")}_${i}`;
      endpoints.push({ id: endpointId, projectId, label: ep.label, url: `${base}${ep.path}`, approved: true });
      const rand = prng(`web:${spec.slug}:${i}`);
      for (let n = 29; n >= 0; n--) {
        const ok = rand() < ep.uptime;
        websiteChecks.push({
          id: `wchk_${spec.slug.replace(/-/g, "_")}_${i}_${n}`,
          endpointId,
          projectId,
          httpStatus: ok ? 200 : rand() < 0.5 ? 503 : null,
          ok,
          latencyMs: ok ? 90 + Math.round(rand() * 400) : null,
          error: ok ? null : "Request timed out or returned a server error (demo observation).",
          checkedAt: iso(new Date(now.getTime() - n * 12 * 3_600_000)),
        });
      }
    });
  }

  // Disputes
  for (const d of DEMO_DISPUTES) {
    const project = projects.find((p) => p.slug === d.projectSlug)!;
    const milestone = d.milestoneKey ? milestones.find((m) => m.projectId === project.id && m.id.endsWith(`_${d.milestoneKey!.replace(/-/g, "_")}`))! : null;
    const submitter = usersByName.get(d.submitter)!;
    const linkedEvidence = milestone && d.evidenceIndex !== undefined ? evidence.filter((e) => e.milestoneId === milestone.id)[d.evidenceIndex] : null;
    const base = `https://${DEMO_PROJECTS.find((p) => p.slug === d.projectSlug)!.domain}`;
    const rec: Dispute = {
      id: d.id,
      projectId: project.id,
      milestoneId: milestone?.id ?? null,
      evidenceId: linkedEvidence?.id ?? null,
      kind: d.kind,
      submitterId: submitter.id,
      submitterName: submitter.displayName,
      submitterKind: d.submitterKind,
      claim: d.claim,
      sourceUrl: d.sourcePath ? `${base}${d.sourcePath}` : null,
      state: d.state,
      resolution: d.resolution ?? null,
      resolvedById: d.state === "resolved" || d.state === "rejected" ? moderator.id : null,
      resolvedAt: d.resolvedDaysAgo !== undefined ? iso(at(-d.resolvedDaysAgo, 12)) : null,
      createdAt: iso(at(-d.createdDaysAgo, 12)),
    };
    disputes.push(rec);
    if (rec.state === "resolved" && milestone) {
      pushFeed({
        id: `feed_dispute_${rec.id}`,
        type: "dispute_resolved",
        projectId: project.id,
        milestoneId: milestone.id,
        evidenceId: null,
        title: `${project.name}: dispute resolved on “${milestone.title}”`,
        summary: rec.resolution ?? "",
        sourceUrl: milestone.sourceUrl,
        occurredAt: rec.resolvedAt!,
        verified: true,
      });
      pushAudit({
        id: `audit_dispute_${rec.id}`,
        actorId: moderator.id,
        actorName: moderator.displayName,
        action: "dispute.resolve",
        targetType: "dispute",
        targetId: rec.id,
        reason: rec.resolution ?? "",
        before: { state: "open" },
        after: { state: "resolved" },
        createdAt: rec.resolvedAt!,
      });
    }
  }

  // Score history: monthly snapshots, oldest two under the legacy formula
  for (const project of projects) {
    const projectMilestones = milestones.filter((m) => m.projectId === project.id);
    const offsets = [-150, -120, -90, -60, -30, 0];
    offsets.forEach((offset, i) => {
      const asOf = at(offset, 3);
      const version = i < 2 ? FORMULA_V0_9.version : FORMULA_V1.version;
      const snap = computeShipScore(
        {
          project,
          milestones: projectMilestones,
          evidence: evidence.filter((e) => e.projectId === project.id && e.accessedAt <= iso(asOf)),
          githubSnapshots: githubSnapshots.filter((s) => s.projectId === project.id && s.retrievedAt <= iso(asOf)),
          websiteChecks: websiteChecks.filter((c) => c.projectId === project.id && c.checkedAt <= iso(asOf)),
          now: asOf,
        },
        version,
      );
      scoreSnapshots.push({ ...snap, id: `score_${project.slug.replace(/-/g, "_")}_${i}` });
    });
    const latest = scoreSnapshots.filter((s) => s.projectId === project.id).at(-1)!;
    project.dataCompleteness = latest.dataCompleteness;
  }

  // Profiles, badges, watchlists
  const badges: Badge[] = DEMO_BADGES.map((b) => ({ id: `badge_${b.slug}`, ...b }));
  const userBadges: UserBadge[] = [];
  const watchlists: Watchlist[] = [];
  const watchlistItems: WatchlistItem[] = [];
  const profiles: Profile[] = DEMO_USERS.map((u) => {
    const accepted = evidence.filter((e) => e.submitterId === u.id && e.reviewState === "accepted").length;
    const helpful = disputes.filter((d) => d.submitterId === u.id && d.state === "resolved").length;
    u.badges.forEach((slug) => userBadges.push({ userId: u.id, badgeId: `badge_${slug}`, awardedAt: iso(at(-u.createdDaysAgo + 30, 12)) }));
    const wl: Watchlist = { id: `wl_${u.id}`, userId: u.id, name: "Following", isPublic: u.watchlistPublic };
    watchlists.push(wl);
    u.watchlist.forEach((slug, i) => {
      const p = projects.find((pr) => pr.slug === slug)!;
      watchlistItems.push({ id: `wli_${u.id}_${i}`, watchlistId: wl.id, projectId: p.id, addedAt: iso(at(-u.createdDaysAgo + 10 + i, 12)) });
    });
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      bio: u.bio,
      watchlistPublic: u.watchlistPublic,
      acceptedEvidenceCount: accepted,
      helpfulCorrectionsCount: helpful,
      createdAt: iso(at(-u.createdDaysAgo, 12)),
      isDemo: true,
    };
  });


  return {
    generatedAt: iso(now),
    projects,
    milestones,
    statusEvents: statusEvents.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    evidence,
    disputes,
    scoreSnapshots,
    githubRepositories,
    githubSnapshots,
    endpoints,
    websiteChecks,
    feedEvents: feedEvents.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    profiles,
    badges,
    userBadges,
    watchlists,
    watchlistItems,
    adminAudit: adminAudit.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    projectSuggestions: [],
  };
}

/** Demo "now" anchored at the current day (midday UTC) so relative deadlines stay stable within a day. */
export function defaultDemoNow(): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

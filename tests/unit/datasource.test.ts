import { beforeEach, describe, expect, it } from "vitest";
import { DemoDataSource, resetDemoStore } from "@/lib/data/demo";
import { recalculateProjectScore } from "@/lib/services/scores";
import type { SessionUser } from "@/lib/domain/types";

const guest: SessionUser = { id: "user_demo_guest", email: null, username: "demo-guest", displayName: "Demo Guest", role: "user", isDemo: true };
const moderator: SessionUser = { id: "user_demo_moderator", email: null, username: "mara-okafor", displayName: "Mara", role: "moderator", isDemo: true };

describe("Demo data source", () => {
  let ds: DemoDataSource;
  beforeEach(() => {
    ds = new DemoDataSource(resetDemoStore(new Date("2026-09-11T12:00:00Z")));
  });

  it("seeds twelve fictional projects with 40+ milestones", async () => {
    const summaries = await ds.listProjectSummaries();
    expect(summaries).toHaveLength(12);
    const milestones = await ds.listMilestones();
    expect(milestones.length).toBeGreaterThan(40);
    expect(summaries.every((s) => s.project.isDemo)).toBe(true);
  });

  it("community submissions stay pending and never change verified status", async () => {
    const project = (await ds.getProjectBySlug("aurelia-chain"))!;
    const milestone = (await ds.listMilestones({ projectId: project.id })).find((m) => m.status === "planned")!;
    const evidence = await ds.createEvidence({
      projectId: project.id,
      milestoneId: milestone.id,
      url: "https://aurelia.example/blog/new",
      type: "official_announcement",
      title: "New announcement",
      summary: "Announcement describing the delivered feature in detail.",
      publishedAt: null,
      conflictOfInterest: null,
      submitter: guest,
    });
    expect(evidence.reviewState).toBe("pending");
    const after = (await ds.getMilestone(milestone.id))!;
    // Automated intake moves it to review, but never to a delivery status.
    expect(after.status).toBe("submitted_for_review");
    const events = await ds.listStatusEvents(milestone.id);
    expect(events.at(-1)?.actorKind).toBe("automated");
  });

  it("moderator status change records an audit event and a status event, then score recalculates", async () => {
    const project = (await ds.getProjectBySlug("tessera-rollup"))!;
    const milestone = (await ds.listMilestones({ projectId: project.id })).find((m) => m.status === "submitted_for_review")!;
    const accepted = await ds.listEvidence({ milestoneId: milestone.id, reviewState: "pending" });
    const reviewed = await ds.reviewEvidence({ evidenceId: accepted[0]!.id, decision: "accepted", reason: "Primary source confirmed against the block explorer.", reviewer: moderator });
    expect(reviewed.reviewState).toBe("accepted");
    const before = (await ds.getLatestScore(project.id))!;
    const { event } = await ds.changeMilestoneStatus({ milestoneId: milestone.id, newStatus: "shipped", reason: "Verified from accepted announcement and dashboard.", evidenceIds: [reviewed.id], actor: moderator });
    expect(event.priorStatus).toBe("submitted_for_review");
    expect(event.newStatus).toBe("shipped");
    expect(event.auditId).toMatch(/^ST-/);
    const audit = await ds.listAdminAudit(5);
    expect(audit[0]?.action).toBe("milestone.status_change");
    expect(audit[0]?.reason).toContain("Verified");
    const snapshot = await recalculateProjectScore(ds, project.id, { actor: moderator, now: new Date("2026-09-11T12:00:00Z") });
    expect(snapshot.formulaVersion).toBe("v1.0.0");
    const history = await ds.listScoreHistory(project.id);
    expect(history.length).toBeGreaterThan(1);
    expect(history.some((h) => h.id === before.id)).toBe(true); // prior snapshot preserved
  });

  it("dispute resolution preserves history and emits a feed event", async () => {
    const open = (await ds.listDisputes({ state: "open" }))[0]!;
    const resolved = await ds.resolveDispute({ disputeId: open.id, state: "resolved", resolution: "Feature confirmed limited to beta; status changed separately.", actor: moderator });
    expect(resolved.state).toBe("resolved");
    const feed = await ds.listFeedEvents({ types: ["dispute_resolved"], projectId: open.projectId, limit: 1 });
    expect(feed[0]?.summary).toContain("beta");
  });

  it("watchlists toggle per user and never expose holdings", async () => {
    const project = (await ds.getProjectBySlug("orbitalk"))!;
    const first = await ds.toggleWatchlistItem(guest.id, project.id);
    expect(first.watching).toBe(true);
    const second = await ds.toggleWatchlistItem(guest.id, project.id);
    expect(second.watching).toBe(false);
    const list = await ds.getWatchlistForUser(guest.id);
    expect(Object.keys(list!.items[0] ?? {})).not.toContain("balance");
  });
});

describe("Idempotent scheduled checks", () => {
  it("records at most one GitHub snapshot per repository per day", async () => {
    const ds = new DemoDataSource(resetDemoStore(new Date("2026-09-11T12:00:00Z")));
    const repo = (await ds.listGithubRepositories())[0]!;
    const base = { repositoryId: repo.id, projectId: repo.projectId, defaultBranch: "main", stars: 1, openIssues: 0, latestReleaseTag: null, latestReleaseAt: null, releasesLast90d: 0, tagsLast90d: 0, activeWeeksLast12: 1, lastPushAt: null, source: "github_api" as const, retrievedAt: "2030-01-01T10:00:00Z" };
    const a = await ds.recordGithubSnapshot(base);
    const b = await ds.recordGithubSnapshot({ ...base, retrievedAt: "2030-01-01T18:00:00Z" });
    const c = await ds.recordGithubSnapshot({ ...base, retrievedAt: "2030-01-02T10:00:00Z" });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.snapshot.id).toBe(a.snapshot.id);
    expect(c.created).toBe(true);
  });

  it("records at most one website check per endpoint per 10-minute bucket", async () => {
    const ds = new DemoDataSource(resetDemoStore(new Date("2026-09-11T12:00:00Z")));
    const endpoint = (await ds.listWebsiteEndpoints())[0]!;
    const base = { endpointId: endpoint.id, projectId: endpoint.projectId, httpStatus: 200, ok: true, latencyMs: 100, error: null, checkedAt: "2030-01-01T10:00:00Z" };
    const a = await ds.recordWebsiteCheck(base);
    const b = await ds.recordWebsiteCheck({ ...base, checkedAt: "2030-01-01T10:05:00Z" });
    const c = await ds.recordWebsiteCheck({ ...base, checkedAt: "2030-01-01T10:20:00Z" });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(c.created).toBe(true);
  });
});

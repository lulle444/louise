import type { Evidence, GithubSnapshot, Milestone, Project, WebsiteCheck } from "@/lib/domain/types";

export const NOW = new Date("2026-09-11T12:00:00Z");

export function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: overrides.id ?? `m-${Math.random().toString(36).slice(2, 8)}`,
    projectId: "p1",
    title: "Milestone",
    commitmentParaphrase: "Ship the thing.",
    sourceUrl: "https://example.org/roadmap",
    sourceAccessedAt: "2026-01-01T00:00:00Z",
    claimDate: "2026-01-01",
    deadline: "2026-06-30",
    originalDeadline: "2026-06-30",
    importance: "major",
    status: "shipped",
    moderatorApproved: true,
    moderatorNote: null,
    deliveredAt: "2026-06-15T00:00:00Z",
    hasUpdatedExplanation: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    auditId: "AUD-TEST",
    ...overrides,
  };
}

export function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: overrides.id ?? `e-${Math.random().toString(36).slice(2, 8)}`,
    projectId: "p1",
    milestoneId: "m1",
    url: "https://example.org/release",
    type: "product_release",
    title: "Release notes 1.0",
    summary: "Release notes describing the shipped feature in detail with links.",
    publishedAt: "2026-06-15",
    accessedAt: "2026-06-16T00:00:00Z",
    submitterId: "mod",
    submitterName: "Moderator",
    submitterKind: "moderator",
    reviewState: "accepted",
    reviewReason: "Primary source",
    reviewedById: "mod",
    reviewedAt: "2026-06-16T00:00:00Z",
    supportCount: 0,
    challengeCount: 0,
    conflictOfInterest: null,
    createdAt: "2026-06-16T00:00:00Z",
    auditId: "AUD-E",
    ...overrides,
  };
}

export const project: Pick<Project, "id" | "transparency"> = {
  id: "p1",
  transparency: { datedRoadmapUpdates: 4, explanationRate: 1, hasPublicDocs: true, changeDisclosureRate: 1 },
};

export function makeSnapshot(overrides: Partial<GithubSnapshot> = {}): GithubSnapshot {
  return {
    id: "gs1",
    repositoryId: "r1",
    projectId: "p1",
    defaultBranch: "main",
    stars: 10,
    openIssues: 1,
    latestReleaseTag: "v1.0.0",
    latestReleaseAt: "2026-08-01T00:00:00Z",
    releasesLast90d: 3,
    tagsLast90d: 0,
    activeWeeksLast12: 12,
    lastPushAt: "2026-09-01T00:00:00Z",
    source: "demo",
    retrievedAt: "2026-09-10T00:00:00Z",
    ...overrides,
  };
}

export function makeChecks(count: number, okEvery = 1): WebsiteCheck[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `wc-${i}`,
    endpointId: "ep1",
    projectId: "p1",
    httpStatus: i % okEvery === 0 ? 200 : 503,
    ok: i % okEvery === 0,
    latencyMs: 120,
    error: null,
    checkedAt: new Date(NOW.getTime() - i * 3_600_000).toISOString(),
  }));
}

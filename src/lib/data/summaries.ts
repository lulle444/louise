import { scoreBand } from "@/lib/domain/score";
import type { Evidence, GithubSnapshot, Milestone, Project, ShipScoreSnapshot, WebsiteCheck } from "@/lib/domain/types";
import type { ProjectFilters, ProjectSummary } from "./types";

const DAY = 86_400_000;

export interface SummaryInputs {
  project: Project;
  milestones: Milestone[];
  score: ShipScoreSnapshot | null;
  evidence: Evidence[];
  githubSnapshots: GithubSnapshot[];
  websiteChecks: WebsiteCheck[];
}

export function buildSummary(input: SummaryInputs, now: Date): ProjectSummary {
  const { project, milestones, score } = input;
  const upcoming = milestones
    .filter((m) => new Date(m.deadline).getTime() >= now.getTime() - DAY && m.status !== "shipped" && m.status !== "cancelled")
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const accepted = input.evidence.filter((e) => e.reviewState === "accepted");
  const lastEvidenceAt = accepted.length ? accepted.reduce((a, b) => (a.accessedAt > b.accessedAt ? a : b)).accessedAt : null;
  const gh = input.githubSnapshots;
  const lastActivityAt = gh.length ? gh.reduce((a, b) => ((a.lastPushAt ?? "") > (b.lastPushAt ?? "") ? a : b)).lastPushAt : null;
  const checks = input.websiteChecks;
  const dataCheckedAt = checks.length ? checks.reduce((a, b) => (a.checkedAt > b.checkedAt ? a : b)).checkedAt : project.updatedAt;
  return {
    project,
    score,
    milestonesTotal: milestones.length,
    milestonesDelivered: milestones.filter((m) => m.status === "shipped" || m.status === "partially_shipped").length,
    nextDeadline: upcoming[0] ?? null,
    lastEvidenceAt,
    lastActivityAt,
    dataCheckedAt,
  };
}

export function matchesQuery(project: Project, milestones: Milestone[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (project.name.toLowerCase().includes(needle)) return true;
  if (project.description.toLowerCase().includes(needle)) return true;
  if (project.category.toLowerCase().includes(needle)) return true;
  if (project.ecosystem.toLowerCase().includes(needle)) return true;
  return milestones.some((m) => m.title.toLowerCase().includes(needle) || m.commitmentParaphrase.toLowerCase().includes(needle));
}

export function filterAndSortSummaries(
  summaries: ProjectSummary[],
  milestonesByProject: Map<string, Milestone[]>,
  filters: ProjectFilters,
  now: Date,
): ProjectSummary[] {
  let list = summaries.filter((s) => filters.includeUnpublished || s.project.status === "published");
  if (filters.q) list = list.filter((s) => matchesQuery(s.project, milestonesByProject.get(s.project.id) ?? [], filters.q!));
  if (filters.category) list = list.filter((s) => s.project.category === filters.category);
  if (filters.ecosystem) list = list.filter((s) => s.project.ecosystem === filters.ecosystem);
  if (filters.milestoneStatus) list = list.filter((s) => (milestonesByProject.get(s.project.id) ?? []).some((m) => m.status === filters.milestoneStatus));
  if (filters.band) list = list.filter((s) => scoreBand(s.score?.total ?? null) === filters.band);
  if (filters.evidenceRecency) {
    const days = filters.evidenceRecency === "7d" ? 7 : filters.evidenceRecency === "30d" ? 30 : 90;
    const cutoff = now.getTime() - days * DAY;
    list = list.filter((s) => s.lastEvidenceAt && new Date(s.lastEvidenceAt).getTime() >= cutoff);
  }
  if (filters.activity) {
    list = list.filter((s) => {
      if (filters.activity === "none") return s.lastActivityAt === null;
      if (!s.lastActivityAt) return false;
      const days = (now.getTime() - new Date(s.lastActivityAt).getTime()) / DAY;
      return filters.activity === "active" ? days <= 30 : days > 30;
    });
  }
  const sort = filters.sort ?? "score";
  return list.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.project.name.localeCompare(b.project.name);
      case "next_deadline":
        return (a.nextDeadline?.deadline ?? "9999").localeCompare(b.nextDeadline?.deadline ?? "9999");
      case "last_evidence":
        return (b.lastEvidenceAt ?? "").localeCompare(a.lastEvidenceAt ?? "");
      case "delivered":
        return b.milestonesDelivered - a.milestonesDelivered || a.project.name.localeCompare(b.project.name);
      case "score":
      default: {
        const at = a.score?.total ?? -1;
        const bt = b.score?.total ?? -1;
        return bt - at || a.project.name.localeCompare(b.project.name);
      }
    }
  });
}

export const SORT_LABELS: Record<NonNullable<ProjectFilters["sort"]>, string> = {
  score: "Ship Score (highest first; insufficient data last)",
  name: "Name (A–Z)",
  next_deadline: "Next deadline (soonest first)",
  last_evidence: "Last accepted evidence (newest first)",
  delivered: "Delivered milestones (most first)",
};

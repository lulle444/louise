import type { Metadata } from "next";
import { DeadlineCalendar, type DeadlineGroup } from "@/components/DeadlineCalendar";
import { PageHeader, cn } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/domain/status";
import type { MilestoneStatus } from "@/lib/domain/types";
import { isoDateOnly } from "@/lib/format";

export const metadata: Metadata = { title: "Deadlines", description: "Public crypto project commitments due this week and this month, grouped by status and project." };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function DeadlinesPage({ searchParams }: { searchParams: Promise<{ range?: string; group?: string }> }) {
  const params = await searchParams;
  const range = params.range === "month" ? "month" : params.range === "past" ? "past" : "week";
  const groupBy = params.group === "project" ? "project" : "status";
  const now = new Date();
  const ds = await getDataSource();
  const summaries = await ds.listProjectSummaries({ sort: "name" });
  const projects = new Map(summaries.map((s) => [s.project.id, s.project]));
  const milestones =
    range === "past"
      ? await ds.listMilestones({ dueAfter: isoDateOnly(new Date(now.getTime() - 30 * DAY)), dueBefore: isoDateOnly(new Date(now.getTime() - DAY)) })
      : await ds.listMilestones({ dueAfter: isoDateOnly(now), dueBefore: isoDateOnly(new Date(now.getTime() + (range === "week" ? 7 : 31) * DAY)) });
  const visible = milestones.filter((m) => projects.has(m.projectId));

  let groups: DeadlineGroup[];
  if (groupBy === "project") {
    groups = Array.from(projects.values())
      .map((p) => ({ label: p.name, milestones: visible.filter((m) => m.projectId === p.id) }))
      .filter((g) => g.milestones.length);
  } else {
    const order: MilestoneStatus[] = ["planned", "in_progress", "submitted_for_review", "delayed", "partially_shipped", "shipped", "no_evidence", "disputed", "cancelled"];
    groups = order.map((s) => ({ label: STATUS_LABELS[s], milestones: visible.filter((m) => m.status === s) }));
  }

  const tab = (key: string, label: string, param: "range" | "group", active: boolean) => (
    <a
      href={`/deadlines?range=${param === "range" ? key : range}&group=${param === "group" ? key : groupBy}`}
      className={cn("rounded-md px-3 py-1.5 text-sm", active ? "bg-primary font-semibold text-white" : "text-slate hover:bg-surface-2 hover:text-ink")}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </a>
  );

  return (
    <div>
      <PageHeader eyebrow="Calendar" title="Commitment deadlines" description="Public deadlines grouped by status or project. Dates are recorded from cited sources; a passing deadline changes nothing until a moderator records a conclusion." />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <nav aria-label="Range" className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {tab("week", "This week", "range", range === "week")}
          {tab("month", "This month", "range", range === "month")}
          {tab("past", "Passed (30 days)", "range", range === "past")}
        </nav>
        <nav aria-label="Group by" className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {tab("status", "By status", "group", groupBy === "status")}
          {tab("project", "By project", "group", groupBy === "project")}
        </nav>
        <span className="font-mono text-xs text-slate" role="status">
          {visible.length} commitments
        </span>
      </div>
      <DeadlineCalendar groups={groups} projects={projects} />
    </div>
  );
}

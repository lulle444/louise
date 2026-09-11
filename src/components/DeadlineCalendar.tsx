import Link from "next/link";
import type { Milestone, Project } from "@/lib/domain/types";
import { formatDate, formatRelative } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "@/components/ui";

export interface DeadlineGroup {
  label: string;
  milestones: Milestone[];
}

/** Grouped, date-ordered list of commitments. No countdown hype — dates and status only. */
export function DeadlineCalendar({ groups, projects }: { groups: DeadlineGroup[]; projects: Map<string, Project> }) {
  const nonEmpty = groups.filter((g) => g.milestones.length > 0);
  if (nonEmpty.length === 0) return <EmptyState title="No commitments in this window" description="Try a wider range or check the shipping feed for recent activity." />;
  return (
    <div className="space-y-8">
      {nonEmpty.map((group) => (
        <section key={group.label} aria-labelledby={`grp-${group.label.replace(/\W+/g, "-")}`}>
          <h2 id={`grp-${group.label.replace(/\W+/g, "-")}`} className="eyebrow mb-3">
            {group.label} · {group.milestones.length}
          </h2>
          <ol className="divide-y divide-border rounded-[14px] border border-border bg-surface">
            {group.milestones.map((m) => {
              const project = projects.get(m.projectId);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <time dateTime={m.deadline} className="w-28 shrink-0 font-mono text-xs text-slate">
                    {formatDate(m.deadline)}
                    <span className="block text-slate-dim">{formatRelative(m.deadline)}</span>
                  </time>
                  <div className="min-w-0 flex-1">
                    <Link href={project ? `/projects/${project.slug}/milestones/${m.id}` : "#"} className="font-medium text-ink hover:text-primary">
                      {m.title}
                    </Link>
                    <p className="text-xs text-slate">
                      {project ? (
                        <Link href={`/projects/${project.slug}`} className="hover:text-ink">
                          {project.name}
                        </Link>
                      ) : null}
                      {" · "}
                      {m.importance} milestone
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

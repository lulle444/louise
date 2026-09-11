import Link from "next/link";
import type { Milestone } from "@/lib/domain/types";
import { formatDate, formatRelative } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

/** Chronological rail of milestones ordered by deadline, with a "today" marker. */
export function MilestoneTimeline({ milestones, projectSlug }: { milestones: Milestone[]; projectSlug: string }) {
  const sorted = [...milestones].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const today = new Date().toISOString().slice(0, 10);
  let todayInserted = false;
  const items: (Milestone | "today")[] = [];
  for (const m of sorted) {
    if (!todayInserted && m.deadline >= today) {
      items.push("today");
      todayInserted = true;
    }
    items.push(m);
  }
  if (!todayInserted) items.push("today");
  return (
    <ol className="timeline-rail space-y-3 pl-8" aria-label="Milestone timeline by deadline">
      {items.map((item, i) =>
        item === "today" ? (
          <li key={`today-${i}`} className="relative py-1">
            <span className="absolute -left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-bg" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-primary">Today · {formatDate(today)}</span>
          </li>
        ) : (
          <li key={item.id} className="relative">
            <span className="absolute -left-8 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface" aria-hidden="true">
              <span className={`h-2 w-2 rounded-full ${item.status === "shipped" ? "bg-mint" : item.status === "no_evidence" ? "bg-coral" : item.status === "delayed" ? "bg-amber" : "bg-slate-dim"}`} />
            </span>
            <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/projects/${projectSlug}/milestones/${item.id}`} className="font-medium text-ink hover:text-primary">
                  {item.title}
                </Link>
                <p className="font-mono text-xs text-slate">
                  deadline {formatDate(item.deadline)} · {formatRelative(item.deadline)}
                  {item.deliveredAt ? ` · delivered ${formatDate(item.deliveredAt)}` : ""}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </li>
        ),
      )}
    </ol>
  );
}

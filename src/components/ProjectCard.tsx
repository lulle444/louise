import Link from "next/link";
import { ArrowRight, CalendarClock, FileCheck2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/data/types";
import { formatDate, formatRelative } from "@/lib/format";
import { DataFreshness } from "./DataFreshness";
import { ShipScoreGauge } from "./ShipScoreGauge";
import { StatusBadge } from "./StatusBadge";
import { Pill } from "@/components/ui";

export function ProjectCard({ summary, compareHref }: { summary: ProjectSummary; compareHref?: string }) {
  const { project, score, milestonesTotal, milestonesDelivered, nextDeadline, lastEvidenceAt, dataCheckedAt } = summary;
  return (
    <article className="card group flex h-full flex-col gap-4 p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="primary">{project.category}</Pill>
            <span className="text-xs text-slate">{project.ecosystem}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-ink">
            <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {project.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate">{project.description}</p>
        </div>
        <ShipScoreGauge total={score?.total ?? null} size={72} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-slate">Delivered</dt>
          <dd className="font-mono text-ink">
            {milestonesDelivered}/{milestonesTotal} milestones
          </dd>
        </div>
        <div>
          <dt className="text-slate">Next deadline</dt>
          <dd className="flex items-center gap-1 font-mono text-ink">
            <CalendarClock className="h-3 w-3 text-slate" aria-hidden="true" />
            {nextDeadline ? `${formatDate(nextDeadline.deadline)} · ${formatRelative(nextDeadline.deadline)}` : "none listed"}
          </dd>
        </div>
        <div>
          <dt className="text-slate">Last accepted evidence</dt>
          <dd className="flex items-center gap-1 font-mono text-ink">
            <FileCheck2 className="h-3 w-3 text-slate" aria-hidden="true" />
            {lastEvidenceAt ? formatRelative(lastEvidenceAt) : "none yet"}
          </dd>
        </div>
        <div>
          <dt className="text-slate">Next item status</dt>
          <dd>{nextDeadline ? <StatusBadge status={nextDeadline.status} /> : <span className="font-mono text-ink">—</span>}</dd>
        </div>
      </dl>

      <div className="relative mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
        <DataFreshness checkedAt={dataCheckedAt} />
        <div className="flex items-center gap-3">
          {compareHref ? (
            <Link href={compareHref} className="relative z-10 text-xs text-slate hover:text-ink">
              Compare
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            Profile <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}

import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, Scale } from "lucide-react";
import type { Evidence, Milestone, MilestoneStatusEvent } from "@/lib/domain/types";
import { formatDate, formatRelative } from "@/lib/format";
import { EvidenceTypeBadge, ReviewStamp } from "./EvidenceStamp";
import { SourceChip } from "./SourceChip";
import { StatusBadge } from "./StatusBadge";
import { StatusHistory } from "./StatusHistory";
import { Pill } from "@/components/ui";

const IMPORTANCE_LABEL = { core: "Core", major: "Major", minor: "Minor" } as const;

export function MilestoneCard({
  milestone,
  projectSlug,
  evidence,
  events,
  compact = false,
}: {
  milestone: Milestone;
  projectSlug: string;
  evidence: Evidence[];
  events: MilestoneStatusEvent[];
  compact?: boolean;
}) {
  const accepted = evidence.filter((e) => e.reviewState === "accepted");
  const pending = evidence.filter((e) => e.reviewState === "pending" || e.reviewState === "needs_clarification");
  const deadlineMoved = milestone.originalDeadline !== milestone.deadline;
  const href = `/projects/${projectSlug}/milestones/${milestone.id}`;
  return (
    <article className="card p-5" aria-labelledby={`ms-${milestone.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={milestone.status} />
            <Pill tone={milestone.importance === "core" ? "violet" : "neutral"}>{IMPORTANCE_LABEL[milestone.importance]} milestone</Pill>
            {!milestone.moderatorApproved ? <Pill tone="amber">Awaiting moderator approval · not scored</Pill> : null}
          </div>
          <h3 id={`ms-${milestone.id}-title`} className="mt-2 text-base font-semibold text-ink">
            <Link href={href} className="hover:text-primary">
              {milestone.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-dim">Commitment (paraphrase) · </span>
            {milestone.commitmentParaphrase}
          </p>
        </div>
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">
          Evidence room <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate">Claimed</dt>
          <dd className="font-mono text-ink">{formatDate(milestone.claimDate)}</dd>
        </div>
        <div>
          <dt className="text-slate">Deadline</dt>
          <dd className="flex items-center gap-1 font-mono text-ink">
            <CalendarDays className="h-3 w-3 text-slate" aria-hidden="true" />
            {formatDate(milestone.deadline)} <span className="text-slate">({formatRelative(milestone.deadline)})</span>
          </dd>
          {deadlineMoved ? <dd className="text-slate-dim">originally {formatDate(milestone.originalDeadline)}</dd> : null}
        </div>
        <div>
          <dt className="text-slate">Delivered</dt>
          <dd className="font-mono text-ink">{milestone.deliveredAt ? formatDate(milestone.deliveredAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-slate">Evidence</dt>
          <dd className="font-mono text-ink">
            {accepted.length} accepted{pending.length ? `, ${pending.length} pending` : ""}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceChip url={milestone.sourceUrl} label="Original source" accessedAt={milestone.sourceAccessedAt} />
        {milestone.status === "disputed" ? (
          <span className="stamp text-violet">
            <Scale className="h-3 w-3" aria-hidden="true" /> Status disputed; excluded from score
          </span>
        ) : null}
        {milestone.status === "no_evidence" ? (
          <span className="stamp text-coral">No qualifying evidence found as of {formatDate(milestone.updatedAt)}</span>
        ) : null}
      </div>

      {milestone.moderatorNote ? (
        <p className="mt-3 rounded-lg border border-border bg-bg p-3 text-xs text-slate">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-dim">Moderator note · </span>
          {milestone.moderatorNote}
        </p>
      ) : null}

      {!compact && evidence.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {evidence.slice(0, 3).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-slate" aria-hidden="true" />
              <Link href={`/proof/${e.id}`} className="font-medium text-ink hover:text-primary">
                {e.title}
              </Link>
              <EvidenceTypeBadge type={e.type} />
              <ReviewStamp state={e.reviewState} />
            </li>
          ))}
          {evidence.length > 3 ? (
            <li className="text-xs text-slate">
              <Link href={href} className="text-primary hover:underline">
                +{evidence.length - 3} more in the Evidence Room
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}

      {!compact ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate hover:text-ink">Status history ({events.length})</summary>
          <div className="mt-2">
            <StatusHistory events={events} compact />
          </div>
        </details>
      ) : null}
    </article>
  );
}

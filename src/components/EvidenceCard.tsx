import Link from "next/link";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Evidence } from "@/lib/domain/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { EvidenceTypeBadge, ReviewStamp } from "./EvidenceStamp";
import { SourceChip } from "./SourceChip";
import { Pill } from "@/components/ui";

const KIND_LABEL = { moderator: "Moderator", community: "Community submission", project: "Project claim", automated: "Automated observation" } as const;
const KIND_TONE = { moderator: "mint", community: "violet", project: "amber", automated: "primary" } as const;

export function EvidenceCard({ evidence, showProofLink = true, children }: { evidence: Evidence; showProofLink?: boolean; children?: React.ReactNode }) {
  return (
    <article className="card p-4" aria-labelledby={`ev-${evidence.id}-title`}>
      <div className="flex flex-wrap items-center gap-2">
        <ReviewStamp state={evidence.reviewState} />
        <EvidenceTypeBadge type={evidence.type} />
        <Pill tone={KIND_TONE[evidence.submitterKind]}>{KIND_LABEL[evidence.submitterKind]}</Pill>
      </div>
      <h3 id={`ev-${evidence.id}-title`} className="mt-2 font-semibold text-ink">
        {showProofLink ? (
          <Link href={`/proof/${evidence.id}`} className="hover:text-primary">
            {evidence.title}
          </Link>
        ) : (
          evidence.title
        )}
      </h3>
      <p className="mt-1 text-sm text-slate">{evidence.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceChip url={evidence.url} accessedAt={evidence.accessedAt} />
        {evidence.publishedAt ? <span className="font-mono text-xs text-slate">published {formatDate(evidence.publishedAt)}</span> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate">Submitted by</dt>
          <dd className="text-ink">{evidence.submitterName}</dd>
        </div>
        <div>
          <dt className="text-slate">Review</dt>
          <dd className="text-ink">{evidence.reviewedAt ? formatDateTime(evidence.reviewedAt) : "Pending"}</dd>
        </div>
        <div>
          <dt className="text-slate">Community</dt>
          <dd className="flex items-center gap-2 text-ink">
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-mint" aria-hidden="true" /> {evidence.supportCount} support
            </span>
            <span className="inline-flex items-center gap-1">
              <ThumbsDown className="h-3 w-3 text-coral" aria-hidden="true" /> {evidence.challengeCount} challenge
            </span>
          </dd>
        </div>
      </dl>
      {evidence.reviewReason ? (
        <p className="mt-3 rounded-lg border border-border bg-bg p-3 text-xs text-slate">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-dim">Moderator conclusion · </span>
          {evidence.reviewReason}
        </p>
      ) : null}
      {evidence.conflictOfInterest ? (
        <p className="mt-2 text-xs text-amber">Disclosed conflict of interest: {evidence.conflictOfInterest}</p>
      ) : null}
      <p className="mt-2 font-mono text-[11px] text-slate-dim">Audit record {evidence.auditId} · database identifier, not a blockchain claim</p>
      {children}
    </article>
  );
}

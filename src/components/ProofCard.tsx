import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Evidence, Milestone, Project } from "@/lib/domain/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { EvidenceTypeBadge, ReviewStamp } from "./EvidenceStamp";
import { SourceChip } from "./SourceChip";
import { StatusBadge } from "./StatusBadge";

export function ProofCard({ evidence, milestone, project }: { evidence: Evidence; milestone: Milestone | null; project: Project }) {
  return (
    <article className="card relative overflow-hidden p-6" aria-labelledby="proof-title">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet/10 blur-3xl" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="stamp text-violet">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Proof card
        </span>
        <ReviewStamp state={evidence.reviewState} />
      </div>
      <p className="mt-4 eyebrow">
        <Link href={`/projects/${project.slug}`} className="hover:underline">
          {project.name}
        </Link>{" "}
        · {project.category}
      </p>
      <h1 id="proof-title" className="mt-1 text-2xl font-bold tracking-tight text-ink">
        {evidence.title}
      </h1>
      {milestone ? (
        <p className="mt-2 text-sm text-slate">
          Evidence for milestone{" "}
          <Link href={`/projects/${project.slug}/milestones/${milestone.id}`} className="text-ink underline decoration-border-strong underline-offset-4 hover:decoration-primary">
            {milestone.title}
          </Link>
        </p>
      ) : null}
      <p className="mt-3 text-sm text-slate">{evidence.summary}</p>
      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate">Evidence category</dt>
          <dd className="mt-1">
            <EvidenceTypeBadge type={evidence.type} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate">Milestone status</dt>
          <dd className="mt-1">{milestone ? <StatusBadge status={milestone.status} /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate">Source</dt>
          <dd className="mt-1">
            <SourceChip url={evidence.url} accessedAt={evidence.accessedAt} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate">Verification</dt>
          <dd className="mt-1 text-ink">
            {evidence.reviewState === "accepted" && evidence.reviewedAt ? `Verified ${formatDateTime(evidence.reviewedAt)}` : "Not yet verified by a moderator"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate">Published</dt>
          <dd className="mt-1 text-ink">{evidence.publishedAt ? formatDate(evidence.publishedAt) : "Not stated"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-slate">Audit record</dt>
          <dd className="mt-1 font-mono text-ink">{evidence.auditId}</dd>
        </div>
      </dl>
      {evidence.reviewReason ? (
        <p className="mt-4 rounded-lg border border-border bg-bg p-3 text-xs text-slate">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-dim">Moderator conclusion · </span>
          {evidence.reviewReason}
        </p>
      ) : null}
    </article>
  );
}

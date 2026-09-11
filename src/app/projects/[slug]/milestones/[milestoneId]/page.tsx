import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Fingerprint, Scale } from "lucide-react";
import { EvidenceCard } from "@/components/EvidenceCard";
import { EvidenceVotes } from "@/components/EvidenceVotes";
import { SourceChip } from "@/components/SourceChip";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusHistory } from "@/components/StatusHistory";
import { ButtonLink, EmptyState, Pill, SectionHeading } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { canSubmit, isModerator } from "@/lib/domain/auth";
import { rankEvidence } from "@/lib/domain/evidence";
import { STATUS_DESCRIPTIONS } from "@/lib/domain/status";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import { StatusChangeForm } from "@/components/ModerationQueue";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; milestoneId: string }> }): Promise<Metadata> {
  const { milestoneId } = await params;
  const ds = await getDataSource();
  const milestone = await ds.getMilestone(milestoneId);
  return { title: milestone ? `${milestone.title} · Evidence Room` : "Milestone not found" };
}

export default async function MilestonePage({ params }: { params: Promise<{ slug: string; milestoneId: string }> }) {
  const { slug, milestoneId } = await params;
  const ds = await getDataSource();
  const [project, milestone, user] = await Promise.all([ds.getProjectBySlug(slug), ds.getMilestone(milestoneId), getSessionUser()]);
  if (!project || !milestone || milestone.projectId !== project.id || project.status !== "published") notFound();
  const [events, evidence, disputes] = await Promise.all([ds.listStatusEvents(milestone.id), ds.listEvidence({ milestoneId: milestone.id }), ds.listDisputes({ milestoneId: milestone.id })]);
  const accepted = rankEvidence(evidence.filter((e) => e.reviewState === "accepted"));
  const pending = evidence.filter((e) => e.reviewState === "pending" || e.reviewState === "needs_clarification");
  const rejected = evidence.filter((e) => e.reviewState === "rejected");
  const conclusion = [...events].reverse().find((e) => e.actorKind === "moderator" && e.priorStatus !== null);
  const support = evidence.reduce((n, e) => n + e.supportCount, 0);
  const challenge = evidence.reduce((n, e) => n + e.challengeCount, 0);
  const path = `/projects/${project.slug}/milestones/${milestone.id}`;

  return (
    <div className="space-y-10">
      <nav aria-label="Breadcrumb" className="text-sm text-slate">
        <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1 hover:text-ink">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {project.name}
        </Link>
      </nav>

      <header className="card p-6 sm:p-8">
        <p className="eyebrow">Evidence Room</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={milestone.status} size="md" />
          <Pill tone={milestone.importance === "core" ? "violet" : "neutral"}>{milestone.importance} milestone</Pill>
          {!milestone.moderatorApproved ? <Pill tone="amber">Not yet approved for scoring</Pill> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{milestone.title}</h1>
        <p className="mt-2 text-sm text-slate">{STATUS_DESCRIPTIONS[milestone.status]}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-xs uppercase tracking-wider text-slate">Commitment (short paraphrase of the public source)</dt>
            <dd className="mt-1 text-ink">{milestone.commitmentParaphrase}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate">Original source</dt>
            <dd className="mt-1">
              <SourceChip url={milestone.sourceUrl} accessedAt={milestone.sourceAccessedAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate">Claim date</dt>
            <dd className="mt-1 font-mono text-ink">{formatDate(milestone.claimDate)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate">Deadline</dt>
            <dd className="mt-1 font-mono text-ink">
              {formatDate(milestone.deadline)} <span className="text-slate">({formatRelative(milestone.deadline)})</span>
              {milestone.originalDeadline !== milestone.deadline ? <span className="block text-xs text-slate-dim">originally {formatDate(milestone.originalDeadline)}</span> : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate">Delivered</dt>
            <dd className="mt-1 font-mono text-ink">{milestone.deliveredAt ? formatDate(milestone.deliveredAt) : "—"}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate" title="Immutable database identifier for this record. Not a blockchain claim.">
            <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" /> Audit ID {milestone.auditId}
          </span>
          <span className="font-mono text-xs text-slate">
            Community: {support} support · {challenge} challenge
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <ButtonLink href={`/submit?project=${project.id}&milestone=${milestone.id}`}>Submit evidence</ButtonLink>
            <ButtonLink href={`/submit?project=${project.id}&milestone=${milestone.id}&tab=correction`} variant="secondary">
              <Scale className="h-4 w-4" aria-hidden="true" /> Request correction
            </ButtonLink>
          </div>
        </div>
      </header>

      {milestone.status === "no_evidence" ? (
        <p className="rounded-lg border border-coral/40 bg-coral-soft px-4 py-3 text-sm text-coral">No qualifying evidence found as of {formatDate(milestone.updatedAt)}. This records the absence of verified public evidence at the time of the check; it is not a conclusion about the project.</p>
      ) : null}
      {milestone.status === "disputed" ? (
        <p className="rounded-lg border border-violet/40 bg-violet-soft px-4 py-3 text-sm text-violet">Status disputed; excluded from score until a moderator records a resolution.</p>
      ) : null}

      <section aria-labelledby="conclusion-h" className="card p-5">
        <SectionHeading id="conclusion-h" eyebrow="Moderator conclusion" title={conclusion ? `Recorded ${formatDateTime(conclusion.createdAt)}` : "No moderator conclusion yet"} />
        {conclusion ? (
          <p className="text-sm text-ink">{conclusion.reason}</p>
        ) : (
          <p className="text-sm text-slate">This milestone has been recorded from its cited source; no verified conclusion has been reached.</p>
        )}
        {milestone.moderatorNote ? <p className="mt-3 text-sm text-slate">Note: {milestone.moderatorNote}</p> : null}
      </section>

      <section aria-labelledby="accepted-h">
        <SectionHeading id="accepted-h" eyebrow="Verified from public evidence" title={`Accepted evidence (${accepted.length})`} description="Ranked by the evidence hierarchy: product/release with docs, repository release, official announcement, independent reporting, community observation." />
        {accepted.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {accepted.map((e) => (
              <EvidenceCard key={e.id} evidence={e}>
                <div className="mt-3 border-t border-border pt-3">
                  <EvidenceVotes evidenceId={e.id} path={path} signedIn={canSubmit(user)} />
                </div>
              </EvidenceCard>
            ))}
          </div>
        ) : (
          <EmptyState title="No accepted evidence" description="Nothing has been verified for this milestone yet." action={<ButtonLink href={`/submit?project=${project.id}&milestone=${milestone.id}`}>Submit evidence</ButtonLink>} />
        )}
      </section>

      {pending.length ? (
        <section aria-labelledby="pending-h">
          <SectionHeading id="pending-h" eyebrow="Unverified" title={`Pending community submissions (${pending.length})`} description="Visible for transparency. These do not affect status or score until a moderator reviews them." />
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((e) => (
              <EvidenceCard key={e.id} evidence={e}>
                <div className="mt-3 border-t border-border pt-3">
                  <EvidenceVotes evidenceId={e.id} path={path} signedIn={canSubmit(user)} />
                </div>
              </EvidenceCard>
            ))}
          </div>
        </section>
      ) : null}

      {rejected.length ? (
        <section aria-labelledby="rejected-h">
          <SectionHeading id="rejected-h" eyebrow="Not accepted" title={`Rejected submissions (${rejected.length})`} description="Kept in the record with the moderator's reason." />
          <div className="grid gap-4 lg:grid-cols-2">
            {rejected.map((e) => (
              <EvidenceCard key={e.id} evidence={e} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="history-h">
        <SectionHeading id="history-h" eyebrow="Audit trail" title="Status history" description="Every transition records the actor, timestamp, reason, evidence references, and prior/new status. Entries are never deleted." />
        <div className="card p-5">
          <StatusHistory events={events} />
        </div>
      </section>

      {disputes.length ? (
        <section aria-labelledby="disputes-h">
          <SectionHeading id="disputes-h" eyebrow="Corrections" title={`Disputes and corrections (${disputes.length})`} />
          <ul className="space-y-3">
            {disputes.map((d) => (
              <li key={d.id} className="card p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={d.state === "resolved" ? "mint" : d.state === "rejected" ? "coral" : "violet"}>{d.state.replace("_", " ")}</Pill>
                  <Pill tone="neutral">{d.kind}</Pill>
                  <Pill tone={d.submitterKind === "project" ? "amber" : "violet"}>{d.submitterKind === "project" ? "project representative" : "community"}</Pill>
                  <span className="font-mono text-xs text-slate">{formatDate(d.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-ink">{d.claim}</p>
                {d.sourceUrl ? (
                  <div className="mt-2">
                    <SourceChip url={d.sourceUrl} />
                  </div>
                ) : null}
                {d.resolution ? <p className="mt-2 rounded-lg border border-border bg-bg p-3 text-xs text-slate">Resolution: {d.resolution}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isModerator(user) ? (
        <section aria-labelledby="mod-h" className="card border-mint/30 p-5">
          <SectionHeading id="mod-h" eyebrow="Moderator tools" title="Change verified status" description="Requires a reason. Delivery statuses require accepted evidence references. Creates an audit event and recalculates the Ship Score." />
          <StatusChangeForm milestone={milestone} acceptedEvidence={accepted} projectSlug={project.slug} />
        </section>
      ) : null}
    </div>
  );
}

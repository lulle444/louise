"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changeStatusAction, resolveDisputeAction, reviewEvidenceAction } from "@/lib/actions/moderation";
import { initialActionState } from "@/lib/actions/types";
import { allowedTransitions, STATUS_LABELS } from "@/lib/domain/status";
import type { Dispute, Evidence, Milestone, MilestoneStatus } from "@/lib/domain/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { EvidenceTypeBadge, ReviewStamp } from "./EvidenceStamp";
import { ActionMessage, SubmitButton } from "./FormStatus";
import { SourceChip } from "./SourceChip";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, Field, Pill, inputClass } from "@/components/ui";

export interface QueueEvidenceItem {
  evidence: Evidence;
  projectName: string;
  projectSlug: string;
  milestone: Milestone | null;
}

export function EvidenceReviewCard({ item }: { item: QueueEvidenceItem }) {
  const [state, action] = useActionState(reviewEvidenceAction, initialActionState);
  const { evidence, milestone } = item;
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReviewStamp state={evidence.reviewState} />
        <EvidenceTypeBadge type={evidence.type} />
        <Pill tone="violet">{evidence.submitterKind}</Pill>
        <span className="font-mono text-xs text-slate">{formatDateTime(evidence.createdAt)}</span>
      </div>
      <h3 className="mt-2 font-semibold text-ink">{evidence.title}</h3>
      <p className="text-xs text-slate">
        <Link href={`/projects/${item.projectSlug}`} className="hover:text-ink">
          {item.projectName}
        </Link>
        {milestone ? (
          <>
            {" · "}
            <Link href={`/projects/${item.projectSlug}/milestones/${milestone.id}`} className="hover:text-ink">
              {milestone.title}
            </Link>{" "}
            <StatusBadge status={milestone.status} />
          </>
        ) : null}
      </p>
      <p className="mt-2 text-sm text-slate">{evidence.summary}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate">
        <SourceChip url={evidence.url} accessedAt={evidence.accessedAt} />
        <span>submitted by {evidence.submitterName}</span>
        {evidence.conflictOfInterest ? <span className="text-amber">COI: {evidence.conflictOfInterest}</span> : null}
        <span>
          {evidence.supportCount} support · {evidence.challengeCount} challenge
        </span>
      </div>
      {state.ok ? (
        <div className="mt-3">
          <ActionMessage state={state} />
        </div>
      ) : (
        <form action={action} className="mt-4 space-y-3 border-t border-border pt-4">
          <input type="hidden" name="evidenceId" value={evidence.id} />
          <ActionMessage state={state} />
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Field label="Decision" htmlFor={`decision-${evidence.id}`} error={state.errors?.decision} required>
              <select id={`decision-${evidence.id}`} name="decision" className={inputClass} defaultValue="accepted">
                <option value="accepted">Accept</option>
                <option value="rejected">Reject</option>
                <option value="needs_clarification">Request clarification</option>
              </select>
            </Field>
            <Field label="Reason (recorded publicly)" htmlFor={`reason-${evidence.id}`} error={state.errors?.reason} required>
              <input id={`reason-${evidence.id}`} name="reason" type="text" minLength={10} maxLength={1000} className={inputClass} placeholder="e.g. Primary source: release notes match the commitment scope." required />
            </Field>
          </div>
          <SubmitButton variant="secondary">Record decision</SubmitButton>
        </form>
      )}
    </article>
  );
}

export function StatusChangeForm({ milestone, acceptedEvidence, projectSlug }: { milestone: Milestone; acceptedEvidence: Evidence[]; projectSlug: string }) {
  const [state, action] = useActionState(changeStatusAction, initialActionState);
  const options = allowedTransitions(milestone.status);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate">Current:</span>
        <StatusBadge status={milestone.status} />
        <Link href={`/projects/${projectSlug}/milestones/${milestone.id}`} className="text-xs text-primary hover:underline">
          Open evidence room
        </Link>
      </div>
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="New status" htmlFor={`status-${milestone.id}`} error={state.errors?.newStatus} required>
          <select id={`status-${milestone.id}`} name="newStatus" className={inputClass} defaultValue={options[0]}>
            {options.map((s: MilestoneStatus) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Evidence references (accepted only)" htmlFor={`ev-${milestone.id}`} hint="Required for shipped / partially shipped.">
          <select id={`ev-${milestone.id}`} name="evidenceIds" multiple className={`${inputClass} h-24`}>
            {acceptedEvidence.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Reason (recorded in status history)" htmlFor={`sreason-${milestone.id}`} error={state.errors?.reason} required>
        <textarea id={`sreason-${milestone.id}`} name="reason" rows={2} minLength={10} maxLength={1000} className={inputClass} required />
      </Field>
      <SubmitButton variant="secondary">Change status &amp; record audit event</SubmitButton>
    </form>
  );
}

export function DisputeResolutionCard({ dispute, projectName, projectSlug, milestoneTitle }: { dispute: Dispute; projectName: string; projectSlug: string; milestoneTitle: string | null }) {
  const [state, action] = useActionState(resolveDisputeAction, initialActionState);
  const tone = dispute.state === "resolved" ? "mint" : dispute.state === "rejected" ? "coral" : dispute.state === "under_review" ? "amber" : "violet";
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={tone}>{dispute.state.replace("_", " ")}</Pill>
        <Pill tone="neutral">{dispute.kind}</Pill>
        <Pill tone={dispute.submitterKind === "project" ? "amber" : "violet"}>{dispute.submitterKind === "project" ? "Project representative" : "Community"}</Pill>
        <span className="font-mono text-xs text-slate">{formatDate(dispute.createdAt)}</span>
      </div>
      <p className="mt-2 text-xs text-slate">
        <Link href={`/projects/${projectSlug}`} className="hover:text-ink">
          {projectName}
        </Link>
        {milestoneTitle ? ` · ${milestoneTitle}` : " · project-level"} · filed by {dispute.submitterName}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm text-ink">{dispute.claim}</p>
      {dispute.sourceUrl ? (
        <div className="mt-2">
          <SourceChip url={dispute.sourceUrl} />
        </div>
      ) : null}
      {dispute.resolution ? (
        <p className="mt-3 rounded-lg border border-border bg-bg p-3 text-xs text-slate">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-dim">Resolution · </span>
          {dispute.resolution}
        </p>
      ) : null}
      {dispute.state === "open" || dispute.state === "under_review" ? (
        state.ok ? (
          <div className="mt-3">
            <ActionMessage state={state} />
          </div>
        ) : (
          <form action={action} className="mt-4 space-y-3 border-t border-border pt-4">
            <input type="hidden" name="disputeId" value={dispute.id} />
            <ActionMessage state={state} />
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <Field label="Outcome" htmlFor={`dstate-${dispute.id}`} required>
                <select id={`dstate-${dispute.id}`} name="state" className={inputClass} defaultValue={dispute.state === "open" ? "under_review" : "resolved"}>
                  <option value="under_review">Mark under review</option>
                  <option value="resolved">Resolve (upheld / corrected)</option>
                  <option value="rejected">Reject (no change)</option>
                </select>
              </Field>
              <Field label="Resolution note (public)" htmlFor={`dres-${dispute.id}`} error={state.errors?.resolution} required>
                <input id={`dres-${dispute.id}`} name="resolution" type="text" minLength={10} maxLength={1500} className={inputClass} required />
              </Field>
            </div>
            <p className="text-xs text-slate">Resolving a dispute does not change milestone status by itself. Use the status form for the milestone and cite the evidence.</p>
            <SubmitButton variant="secondary">Record resolution</SubmitButton>
          </form>
        )
      ) : null}
    </article>
  );
}

export function ModerationQueue({ items }: { items: QueueEvidenceItem[] }) {
  if (items.length === 0) return <EmptyState title="Queue is empty" description="No evidence awaiting review." />;
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <EvidenceReviewCard key={item.evidence.id} item={item} />
      ))}
    </div>
  );
}

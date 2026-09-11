"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { submitDispute, submitEvidence, suggestProject } from "@/lib/actions/submissions";
import { initialActionState } from "@/lib/actions/types";
import { EVIDENCE_TYPE_LABELS } from "@/lib/domain/evidence";
import { EVIDENCE_TYPES, PROJECT_CATEGORIES, type EvidenceType } from "@/lib/domain/types";
import { ActionMessage, SubmitButton } from "./FormStatus";
import { Alert, Field, cn, inputClass } from "@/components/ui";

export interface SubmissionProjectOption {
  id: string;
  name: string;
  slug: string;
  milestones: { id: string; title: string; status: string }[];
}

type Tab = "evidence" | "correction" | "project";
const DEFAULT_TYPE: EvidenceType = "official_announcement";

export function SubmissionForm({
  projects,
  defaultTab = "evidence",
  defaultProjectId,
  defaultMilestoneId,
  defaultEvidenceId,
  isDemo,
}: {
  projects: SubmissionProjectOption[];
  defaultTab?: Tab;
  defaultProjectId?: string;
  defaultMilestoneId?: string;
  defaultEvidenceId?: string;
  isDemo: boolean;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const tabs: { key: Tab; label: string }[] = [
    { key: "evidence", label: "Submit evidence" },
    { key: "correction", label: "Request a correction" },
    { key: "project", label: "Suggest a project" },
  ];
  return (
    <div className="card p-5 sm:p-6">
      <div role="tablist" aria-label="Submission type" className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            id={`tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={cn("rounded-md px-3 py-1.5 text-sm", tab === t.key ? "bg-primary text-bg font-semibold" : "text-slate hover:bg-surface-2 hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Alert tone="primary">
          Submissions are public, attributed to your username, and reviewed by moderators before anything changes. They never directly change a verified status or score.
          {isDemo ? " In Demo Mode, submissions are stored in memory and reset when the server restarts." : ""}
        </Alert>
      </div>
      <div id="panel-evidence" role="tabpanel" aria-labelledby="tab-evidence" hidden={tab !== "evidence"} className="mt-5">
        <EvidenceForm projects={projects} defaultProjectId={defaultProjectId} defaultMilestoneId={defaultMilestoneId} />
      </div>
      <div id="panel-correction" role="tabpanel" aria-labelledby="tab-correction" hidden={tab !== "correction"} className="mt-5">
        <CorrectionForm projects={projects} defaultProjectId={defaultProjectId} defaultMilestoneId={defaultMilestoneId} defaultEvidenceId={defaultEvidenceId} />
      </div>
      <div id="panel-project" role="tabpanel" aria-labelledby="tab-project" hidden={tab !== "project"} className="mt-5">
        <ProjectSuggestionForm />
      </div>
    </div>
  );
}

function ProjectMilestonePicker({
  projects,
  projectId,
  setProjectId,
  defaultMilestoneId,
  errors,
  milestoneRequired,
}: {
  projects: SubmissionProjectOption[];
  projectId: string;
  setProjectId: (id: string) => void;
  defaultMilestoneId?: string;
  errors?: Record<string, string>;
  milestoneRequired: boolean;
}) {
  const milestones = useMemo(() => projects.find((p) => p.id === projectId)?.milestones ?? [], [projects, projectId]);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Project" htmlFor={`project-${milestoneRequired ? "e" : "c"}`} error={errors?.projectId} required>
        <select id={`project-${milestoneRequired ? "e" : "c"}`} name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass} required>
          <option value="">Choose a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Milestone" htmlFor={`milestone-${milestoneRequired ? "e" : "c"}`} error={errors?.milestoneId} required={milestoneRequired} hint={milestoneRequired ? undefined : "Optional for project-level corrections."}>
        <select id={`milestone-${milestoneRequired ? "e" : "c"}`} name="milestoneId" defaultValue={defaultMilestoneId ?? ""} className={inputClass} required={milestoneRequired}>
          <option value="">{milestoneRequired ? "Choose a milestone" : "Whole project / not milestone-specific"}</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} ({m.status.replace(/_/g, " ")})
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Honeypot() {
  return (
    <div className="hidden" aria-hidden="true">
      <label htmlFor="website">Leave this field empty</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

function PublicAck({ id, error }: { id: string; error?: string }) {
  return (
    <div>
      <label className="flex items-start gap-2 text-sm text-slate">
        <input id={id} name="acknowledgePublic" type="checkbox" className="mt-0.5" required />
        <span>I understand this submission is public, will be attributed to my username, and must reference a public source.</span>
      </label>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function EvidenceForm({ projects, defaultProjectId, defaultMilestoneId }: { projects: SubmissionProjectOption[]; defaultProjectId?: string; defaultMilestoneId?: string }) {
  const [state, action] = useActionState(submitEvidence, initialActionState);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  if (state.ok && state.resultId) {
    return (
      <div className="space-y-3">
        <ActionMessage state={state} />
        <p className="text-sm text-slate">
          View its public record:{" "}
          <Link href={`/proof/${state.resultId}`} className="text-primary underline underline-offset-4">
            Proof card (pending)
          </Link>
          . Moderators will accept, reject, or request clarification with a written reason.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <ActionMessage state={state} />
      <ProjectMilestonePicker projects={projects} projectId={projectId} setProjectId={setProjectId} defaultMilestoneId={defaultMilestoneId} errors={state.errors} milestoneRequired />
      <Field label="Source URL" htmlFor="ev-url" error={state.errors?.url} hint="A public https link to the release, repository tag, documentation, or report. Screenshots without a URL are weak evidence." required>
        <input id="ev-url" name="url" type="url" inputMode="url" placeholder="https://" className={inputClass} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Evidence type" htmlFor="ev-type" error={state.errors?.type} required>
          <select id="ev-type" name="type" className={inputClass} defaultValue={DEFAULT_TYPE}>
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVIDENCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Published date" htmlFor="ev-published" error={state.errors?.publishedAt} hint="If the source shows a date.">
          <input id="ev-published" name="publishedAt" type="date" className={inputClass} />
        </Field>
      </div>
      <Field label="Title" htmlFor="ev-title" error={state.errors?.title} required>
        <input id="ev-title" name="title" type="text" maxLength={160} className={inputClass} placeholder="e.g. Release notes v1.2 list the shipped feature" required />
      </Field>
      <Field label="What does this evidence show?" htmlFor="ev-summary" error={state.errors?.summary} hint="Explain how the source relates to the commitment. Plain text only; HTML is never rendered." required>
        <textarea id="ev-summary" name="summary" rows={4} maxLength={1500} className={inputClass} required />
      </Field>
      <Field label="Conflict of interest (optional)" htmlFor="ev-coi" error={state.errors?.conflictOfInterest} hint="Disclose if you are affiliated with the project.">
        <input id="ev-coi" name="conflictOfInterest" type="text" maxLength={300} className={inputClass} />
      </Field>
      <Honeypot />
      <PublicAck id="ev-ack" error={state.errors?.acknowledgePublic} />
      <SubmitButton>Submit evidence for review</SubmitButton>
    </form>
  );
}

export function CorrectionForm({
  projects,
  defaultProjectId,
  defaultMilestoneId,
  defaultEvidenceId,
}: {
  projects: SubmissionProjectOption[];
  defaultProjectId?: string;
  defaultMilestoneId?: string;
  defaultEvidenceId?: string;
}) {
  const [state, action] = useActionState(submitDispute, initialActionState);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  if (state.ok && state.resultId) return <ActionMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <ActionMessage state={state} />
      <ProjectMilestonePicker projects={projects} projectId={projectId} setProjectId={setProjectId} defaultMilestoneId={defaultMilestoneId} errors={state.errors} milestoneRequired={false} />
      {defaultEvidenceId ? <input type="hidden" name="evidenceId" value={defaultEvidenceId} /> : null}
      <Field label="Type" htmlFor="c-kind" error={state.errors?.kind} required>
        <select id="c-kind" name="kind" className={inputClass} defaultValue="correction">
          <option value="correction">Correction — a fact on the page is wrong or outdated</option>
          <option value="dispute">Dispute — I challenge a verified status or accepted evidence</option>
        </select>
      </Field>
      <Field label="What should be corrected, and why?" htmlFor="c-claim" error={state.errors?.claim} hint="Be specific. Cite what the page says and what the public record shows. At least 30 characters." required>
        <textarea id="c-claim" name="claim" rows={5} maxLength={2000} className={inputClass} required />
      </Field>
      <Field label="Supporting source URL (optional)" htmlFor="c-source" error={state.errors?.sourceUrl}>
        <input id="c-source" name="sourceUrl" type="url" inputMode="url" placeholder="https://" className={inputClass} />
      </Field>
      <Field label="Conflict of interest (optional)" htmlFor="c-coi" error={state.errors?.conflictOfInterest} hint="Project representatives may request corrections but cannot edit status or score directly.">
        <input id="c-coi" name="conflictOfInterest" type="text" maxLength={300} className={inputClass} />
      </Field>
      <Honeypot />
      <PublicAck id="c-ack" error={state.errors?.acknowledgePublic} />
      <SubmitButton>File correction request</SubmitButton>
    </form>
  );
}

export function ProjectSuggestionForm() {
  const [state, action] = useActionState(suggestProject, initialActionState);
  if (state.ok && state.resultId) return <ActionMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" htmlFor="p-name" error={state.errors?.name} required>
          <input id="p-name" name="name" type="text" maxLength={80} className={inputClass} required />
        </Field>
        <Field label="Official website" htmlFor="p-url" error={state.errors?.officialUrl} required>
          <input id="p-url" name="officialUrl" type="url" inputMode="url" placeholder="https://" className={inputClass} required />
        </Field>
        <Field label="Category" htmlFor="p-category" error={state.errors?.category} required>
          <select id="p-category" name="category" className={inputClass} defaultValue="Infrastructure">
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ecosystem" htmlFor="p-eco" error={state.errors?.ecosystem} required>
          <input id="p-eco" name="ecosystem" type="text" maxLength={60} className={inputClass} required />
        </Field>
      </div>
      <Field label="Public roadmap or commitments URL" htmlFor="p-roadmap" error={state.errors?.roadmapUrl} hint="Milestones are only recorded from cited public sources." required>
        <input id="p-roadmap" name="roadmapUrl" type="url" inputMode="url" placeholder="https://" className={inputClass} required />
      </Field>
      <Field label="Short description" htmlFor="p-desc" error={state.errors?.description} required>
        <textarea id="p-desc" name="description" rows={3} maxLength={600} className={inputClass} required />
      </Field>
      <Honeypot />
      <PublicAck id="p-ack" error={state.errors?.acknowledgePublic} />
      <SubmitButton>Suggest project</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createMilestoneAction, recalculateScoreAction, setMilestoneApprovalAction, upsertProjectAction } from "@/lib/actions/moderation";
import { initialActionState } from "@/lib/actions/types";
import { FORMULAS } from "@/lib/domain/score";
import { IMPORTANCE_TIERS, PROJECT_CATEGORIES, type Project } from "@/lib/domain/types";
import { ActionMessage, SubmitButton } from "./FormStatus";
import { Field, inputClass } from "@/components/ui";

export function ProjectForm({ project }: { project?: Project }) {
  const [state, action] = useActionState(upsertProjectAction, initialActionState);
  const prefix = project?.id ?? "new";
  return (
    <form action={action} className="space-y-4">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${prefix}-name`} error={state.errors?.name} required>
          <input id={`${prefix}-name`} name="name" defaultValue={project?.name} className={inputClass} required />
        </Field>
        <Field label="Slug" htmlFor={`${prefix}-slug`} error={state.errors?.slug} required>
          <input id={`${prefix}-slug`} name="slug" defaultValue={project?.slug} className={inputClass} pattern="[a-z0-9-]+" required />
        </Field>
        <Field label="Category" htmlFor={`${prefix}-category`} error={state.errors?.category} required>
          <select id={`${prefix}-category`} name="category" defaultValue={project?.category ?? "Infrastructure"} className={inputClass}>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ecosystem" htmlFor={`${prefix}-eco`} error={state.errors?.ecosystem} required>
          <input id={`${prefix}-eco`} name="ecosystem" defaultValue={project?.ecosystem} className={inputClass} required />
        </Field>
        <Field label="Official URL" htmlFor={`${prefix}-url`} error={state.errors?.officialUrl} required>
          <input id={`${prefix}-url`} name="officialUrl" type="url" defaultValue={project?.officialUrl} className={inputClass} required />
        </Field>
        <Field label="Status" htmlFor={`${prefix}-status`} error={state.errors?.status} required hint="Only published projects are publicly visible.">
          <select id={`${prefix}-status`} name="status" defaultValue={project?.status ?? "draft"} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>
      <Field label="Description" htmlFor={`${prefix}-desc`} error={state.errors?.description} required>
        <textarea id={`${prefix}-desc`} name="description" rows={3} defaultValue={project?.description} className={inputClass} required />
      </Field>
      <SubmitButton variant="secondary">{project ? "Save project" : "Create project"}</SubmitButton>
    </form>
  );
}

export function MilestoneForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createMilestoneAction, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project" htmlFor="ms-project" error={state.errors?.projectId} required>
          <select id="ms-project" name="projectId" className={inputClass} defaultValue="">
            <option value="">Choose a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Importance tier" htmlFor="ms-importance" error={state.errors?.importance} required hint="Core ×3, major ×2, minor ×1 in the delivery component.">
          <select id="ms-importance" name="importance" className={inputClass} defaultValue="major">
            {IMPORTANCE_TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title" htmlFor="ms-title" error={state.errors?.title} required>
          <input id="ms-title" name="title" className={inputClass} required />
        </Field>
        <Field label="Cited source URL" htmlFor="ms-source" error={state.errors?.sourceUrl} required hint="Public roadmap, blog post, or documentation where the commitment appears.">
          <input id="ms-source" name="sourceUrl" type="url" className={inputClass} required />
        </Field>
        <Field label="Claim date" htmlFor="ms-claim" error={state.errors?.claimDate} required>
          <input id="ms-claim" name="claimDate" type="date" className={inputClass} required />
        </Field>
        <Field label="Deadline" htmlFor="ms-deadline" error={state.errors?.deadline} required>
          <input id="ms-deadline" name="deadline" type="date" className={inputClass} required />
        </Field>
      </div>
      <Field label="Commitment (short paraphrase)" htmlFor="ms-para" error={state.errors?.commitmentParaphrase} required hint="Paraphrase the commitment; do not paste large copyrighted passages.">
        <textarea id="ms-para" name="commitmentParaphrase" rows={3} className={inputClass} required />
      </Field>
      <SubmitButton variant="secondary">Create milestone (planned, unapproved)</SubmitButton>
    </form>
  );
}

export function ApprovalForm({ milestoneId, approved }: { milestoneId: string; approved: boolean }) {
  const [state, action] = useActionState(setMilestoneApprovalAction, initialActionState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input type="hidden" name="approved" value={approved ? "false" : "true"} />
      <Field label="Reason" htmlFor={`appr-${milestoneId}`}>
        <input id={`appr-${milestoneId}`} name="reason" className={`${inputClass} w-64`} minLength={10} placeholder="Why this milestone should (not) count" required />
      </Field>
      <SubmitButton variant="secondary">{approved ? "Exclude from scoring" : "Approve for scoring"}</SubmitButton>
      {state.message ? <span className={`text-xs ${state.ok ? "text-mint" : "text-coral"}`}>{state.message}</span> : null}
    </form>
  );
}

export function RecalculateForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, action] = useActionState(recalculateScoreAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Project" htmlFor="rc-project">
          <select id="rc-project" name="projectId" className={inputClass} defaultValue="all">
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Formula version" htmlFor="rc-version" hint="Each recalculation appends a snapshot; earlier snapshots are preserved.">
          <select id="rc-version" name="formulaVersion" className={inputClass} defaultValue={Object.keys(FORMULAS)[0]}>
            {Object.values(FORMULAS).map((f) => (
              <option key={f.version} value={f.version}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <SubmitButton variant="secondary">Recalculate Ship Scores</SubmitButton>
    </form>
  );
}

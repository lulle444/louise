"use server";

import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/data";
import { assertPermission, AuthorizationError } from "@/lib/domain/auth";
import { FORMULAS } from "@/lib/domain/score";
import { validateTransition } from "@/lib/domain/status";
import { sanitizeText } from "@/lib/domain/url";
import {
  disputeResolutionSchema,
  flattenZodError,
  formDataToObject,
  milestoneCreateSchema,
  projectUpsertSchema,
  reviewDecisionSchema,
  statusChangeSchema,
} from "@/lib/domain/validation";
import { recalculateProjectScore } from "@/lib/services/scores";
import { getSessionUser } from "@/lib/session";
import type { ActionState } from "./types";

async function requireModerator(permission: Parameters<typeof assertPermission>[1]) {
  const user = await getSessionUser();
  assertPermission(user, permission);
  return user!;
}

function handleError(error: unknown): ActionState {
  if (error instanceof AuthorizationError) return { ok: false, message: "You are not authorized to perform this action." };
  return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
}

async function revalidateProject(projectId: string, milestoneId?: string | null) {
  const ds = await getDataSource();
  const project = await ds.getProjectById(projectId);
  if (project) {
    revalidatePath(`/projects/${project.slug}`);
    if (milestoneId) revalidatePath(`/projects/${project.slug}/milestones/${milestoneId}`);
  }
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/shipping-feed");
  revalidatePath("/admin");
}

export async function reviewEvidenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const reviewer = await requireModerator("review_evidence");
    const parsed = reviewDecisionSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "A reason is required for every decision." };
    const ds = await getDataSource();
    const evidence = await ds.reviewEvidence({ ...parsed.data, reason: sanitizeText(parsed.data.reason, 1000), reviewer });
    if (evidence.reviewState === "accepted") await recalculateProjectScore(ds, evidence.projectId, { actor: reviewer });
    await revalidateProject(evidence.projectId, evidence.milestoneId);
    revalidatePath(`/proof/${evidence.id}`);
    return { ok: true, message: `Evidence marked ${evidence.reviewState.replace("_", " ")}. The decision and reason are recorded in the audit log.` };
  } catch (error) {
    return handleError(error);
  }
}

export async function changeStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireModerator("change_milestone_status");
    const raw = formDataToObject(formData);
    const evidenceIds = Array.isArray(raw.evidenceIds) ? raw.evidenceIds : raw.evidenceIds ? [raw.evidenceIds] : [];
    const parsed = statusChangeSchema.safeParse({ ...raw, evidenceIds });
    if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "Please fix the highlighted fields." };
    const ds = await getDataSource();
    const milestone = await ds.getMilestone(parsed.data.milestoneId);
    if (!milestone) return { ok: false, message: "Milestone not found." };
    // Only accepted evidence may back a delivery status.
    const accepted = (await ds.listEvidence({ milestoneId: milestone.id, reviewState: "accepted" })).map((e) => e.id);
    const refs = parsed.data.evidenceIds.filter((id) => accepted.includes(id));
    const validation = validateTransition({ from: milestone.status, to: parsed.data.newStatus, reason: parsed.data.reason, evidenceIds: refs });
    if (!validation.ok) return { ok: false, message: validation.error };
    const result = await ds.changeMilestoneStatus({
      milestoneId: milestone.id,
      newStatus: parsed.data.newStatus,
      reason: sanitizeText(parsed.data.reason, 1000),
      evidenceIds: refs,
      actor,
    });
    const snapshot = await recalculateProjectScore(ds, milestone.projectId, { actor });
    await revalidateProject(milestone.projectId, milestone.id);
    return {
      ok: true,
      resultId: result.event.id,
      message: `Status changed to ${parsed.data.newStatus.replace(/_/g, " ")}. Audit event ${result.event.auditId} recorded; Ship Score recalculated (${snapshot.total ?? "insufficient data"}).`,
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function resolveDisputeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireModerator("resolve_dispute");
    const parsed = disputeResolutionSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "A resolution note is required." };
    const ds = await getDataSource();
    const dispute = await ds.resolveDispute({ ...parsed.data, resolution: sanitizeText(parsed.data.resolution, 1500), actor });
    await revalidateProject(dispute.projectId, dispute.milestoneId);
    return { ok: true, message: `Dispute marked ${dispute.state.replace("_", " ")}. Prior decisions remain in the audit history.` };
  } catch (error) {
    return handleError(error);
  }
}

export async function upsertProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireModerator("manage_projects");
    const raw = formDataToObject(formData);
    const parsed = projectUpsertSchema.safeParse({ ...raw, id: raw.id || undefined });
    if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "Please fix the highlighted fields." };
    const ds = await getDataSource();
    const project = await ds.upsertProject({ ...parsed.data, description: sanitizeText(parsed.data.description, 800), actor });
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/admin");
    return { ok: true, resultId: project.id, message: `Project “${project.name}” saved (${project.status}).` };
  } catch (error) {
    return handleError(error);
  }
}

export async function createMilestoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireModerator("manage_projects");
    const parsed = milestoneCreateSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "Please fix the highlighted fields." };
    if (parsed.data.deadline < parsed.data.claimDate) return { ok: false, errors: { deadline: "Deadline must be on or after the claim date." } };
    const ds = await getDataSource();
    const milestone = await ds.createMilestone({
      ...parsed.data,
      title: sanitizeText(parsed.data.title, 140),
      commitmentParaphrase: sanitizeText(parsed.data.commitmentParaphrase, 500),
      actor,
    });
    await revalidateProject(milestone.projectId, milestone.id);
    return { ok: true, resultId: milestone.id, message: `Milestone “${milestone.title}” created as planned. Approve it to include it in scoring.` };
  } catch (error) {
    return handleError(error);
  }
}

export async function setMilestoneApprovalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireModerator("manage_projects");
    const milestoneId = String(formData.get("milestoneId") ?? "");
    const approved = String(formData.get("approved")) === "true";
    const reason = sanitizeText(String(formData.get("reason") ?? ""), 500);
    if (!milestoneId || reason.length < 10) return { ok: false, message: "A reason of at least 10 characters is required." };
    const ds = await getDataSource();
    const milestone = await ds.setMilestoneApproval(milestoneId, approved, reason, actor);
    await recalculateProjectScore(ds, milestone.projectId, { actor });
    await revalidateProject(milestone.projectId, milestone.id);
    return { ok: true, message: approved ? "Milestone approved for scoring." : "Milestone excluded from scoring." };
  } catch (error) {
    return handleError(error);
  }
}

export async function recalculateScoreAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireModerator("recalculate_scores");
    const projectId = String(formData.get("projectId") ?? "");
    const version = String(formData.get("formulaVersion") ?? "");
    if (!FORMULAS[version]) return { ok: false, message: "Unknown formula version." };
    const ds = await getDataSource();
    const targets = projectId === "all" ? (await ds.listProjectSummaries({ includeUnpublished: true })).map((s) => s.project.id) : [projectId];
    const results = [];
    for (const id of targets) results.push(await recalculateProjectScore(ds, id, { version, actor }));
    for (const id of targets) await revalidateProject(id);
    return {
      ok: true,
      message: `Recalculated ${results.length} project(s) with ${version}. New snapshots appended; history preserved.`,
    };
  } catch (error) {
    return handleError(error);
  }
}

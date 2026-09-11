"use server";

import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/data";
import { hasPermission } from "@/lib/domain/auth";
import { getRateLimiter } from "@/lib/domain/ratelimit";
import { sanitizeText } from "@/lib/domain/url";
import { disputeSubmissionSchema, evidenceSubmissionSchema, flattenZodError, formDataToObject, projectSuggestionSchema } from "@/lib/domain/validation";
import { getSessionUser } from "@/lib/session";
import type { ActionState } from "./types";

const SUBMISSION_LIMIT = 5;
const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

function limiter() {
  return getRateLimiter("submissions", SUBMISSION_LIMIT, SUBMISSION_WINDOW_MS);
}

export async function submitEvidence(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "submit_evidence")) return { ok: false, message: "Sign in to submit evidence." };
  const raw = formDataToObject(formData);
  const parsed = evidenceSubmissionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "Please fix the highlighted fields." };
  // Honeypot: bots fill hidden fields.
  if (typeof raw.website === "string" && raw.website.length > 0) return { ok: true, message: "Submission received." };
  const rate = limiter().check(`evidence:${user.id}`);
  if (!rate.allowed) return { ok: false, message: "Rate limit reached. Please wait a few minutes before submitting again." };

  const ds = await getDataSource();
  const milestone = await ds.getMilestone(parsed.data.milestoneId);
  if (!milestone || milestone.projectId !== parsed.data.projectId) return { ok: false, message: "Milestone not found for this project." };
  const evidence = await ds.createEvidence({
    projectId: parsed.data.projectId,
    milestoneId: parsed.data.milestoneId,
    url: parsed.data.url,
    type: parsed.data.type,
    title: sanitizeText(parsed.data.title, 160),
    summary: sanitizeText(parsed.data.summary, 1500),
    publishedAt: parsed.data.publishedAt || null,
    conflictOfInterest: parsed.data.conflictOfInterest ? sanitizeText(parsed.data.conflictOfInterest, 300) : null,
    submitter: user,
  });
  const project = await ds.getProjectById(parsed.data.projectId);
  if (project) {
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath(`/projects/${project.slug}/milestones/${milestone.id}`);
  }
  revalidatePath("/admin");
  return { ok: true, resultId: evidence.id, message: "Evidence submitted. It is visible as pending and will not change verified status until a moderator reviews it." };
}

export async function submitDispute(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "submit_dispute")) return { ok: false, message: "Sign in to request a correction." };
  const raw = formDataToObject(formData);
  const parsed = disputeSubmissionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "Please fix the highlighted fields." };
  if (typeof raw.website === "string" && raw.website.length > 0) return { ok: true, message: "Submission received." };
  const rate = limiter().check(`dispute:${user.id}`);
  if (!rate.allowed) return { ok: false, message: "Rate limit reached. Please wait a few minutes before submitting again." };

  const ds = await getDataSource();
  const project = await ds.getProjectById(parsed.data.projectId);
  if (!project) return { ok: false, message: "Project not found." };
  const dispute = await ds.createDispute({
    projectId: project.id,
    milestoneId: parsed.data.milestoneId || null,
    evidenceId: parsed.data.evidenceId || null,
    kind: parsed.data.kind,
    claim: sanitizeText(`${parsed.data.claim}${parsed.data.conflictOfInterest ? `\n\nDisclosed conflict of interest: ${parsed.data.conflictOfInterest}` : ""}`, 2300),
    sourceUrl: parsed.data.sourceUrl || null,
    submitter: user,
  });
  revalidatePath(`/projects/${project.slug}`);
  if (parsed.data.milestoneId) revalidatePath(`/projects/${project.slug}/milestones/${parsed.data.milestoneId}`);
  revalidatePath("/admin");
  return { ok: true, resultId: dispute.id, message: "Correction request filed. Moderators will review it and record a conclusion; the current verified status is unchanged until then." };
}

export async function suggestProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "submit_evidence")) return { ok: false, message: "Sign in to suggest a project." };
  const raw = formDataToObject(formData);
  const parsed = projectSuggestionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error), message: "Please fix the highlighted fields." };
  if (typeof raw.website === "string" && raw.website.length > 0) return { ok: true, message: "Submission received." };
  const rate = limiter().check(`project:${user.id}`);
  if (!rate.allowed) return { ok: false, message: "Rate limit reached. Please wait a few minutes before submitting again." };
  const ds = await getDataSource();
  const suggestion = await ds.createProjectSuggestion({
    name: sanitizeText(parsed.data.name, 80),
    officialUrl: parsed.data.officialUrl,
    category: parsed.data.category,
    ecosystem: sanitizeText(parsed.data.ecosystem, 60),
    description: sanitizeText(parsed.data.description, 600),
    roadmapUrl: parsed.data.roadmapUrl,
    submitter: user,
  });
  revalidatePath("/admin");
  return { ok: true, resultId: suggestion.id, message: "Project suggestion received. A moderator will review the cited roadmap before anything is published." };
}

export async function voteOnEvidence(evidenceId: string, vote: "support" | "challenge", path: string): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "submit_evidence")) return { ok: false, message: "Sign in to weigh in on evidence." };
  const rate = getRateLimiter("votes", 30, 60_000).check(`vote:${user.id}`);
  if (!rate.allowed) return { ok: false, message: "Too many votes; slow down." };
  const ds = await getDataSource();
  await ds.voteEvidence(evidenceId, vote, user.id);
  revalidatePath(path);
  return { ok: true };
}

import { z } from "zod";
import { EVIDENCE_TYPES, IMPORTANCE_TIERS, MILESTONE_STATUSES, PROJECT_CATEGORIES } from "./types";
import { validatePublicUrl } from "./url";

const publicUrl = z
  .string()
  .trim()
  .max(2048)
  .superRefine((value, ctx) => {
    const result = validatePublicUrl(value);
    if (!result.ok) ctx.addIssue({ code: "custom", message: result.error });
  });

const optionalPublicUrl = z.union([z.literal(""), publicUrl]).optional();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format.");

export const evidenceSubmissionSchema = z.object({
  projectId: z.string().min(1, "Choose a project."),
  milestoneId: z.string().min(1, "Choose a milestone."),
  url: publicUrl,
  type: z.enum(EVIDENCE_TYPES),
  title: z.string().trim().min(5, "Title must be at least 5 characters.").max(160),
  summary: z.string().trim().min(20, "Explain what the evidence shows (at least 20 characters).").max(1500),
  publishedAt: z.union([z.literal(""), isoDate]).optional(),
  conflictOfInterest: z.string().trim().max(300).optional(),
  acknowledgePublic: z.literal("on", { message: "You must acknowledge that submissions are public." }),
});
export type EvidenceSubmissionInput = z.infer<typeof evidenceSubmissionSchema>;

export const disputeSubmissionSchema = z.object({
  projectId: z.string().min(1, "Choose a project."),
  milestoneId: z.string().optional(),
  evidenceId: z.string().optional(),
  kind: z.enum(["correction", "dispute"]),
  claim: z.string().trim().min(30, "Describe the correction in at least 30 characters.").max(2000),
  sourceUrl: optionalPublicUrl,
  conflictOfInterest: z.string().trim().max(300).optional(),
  acknowledgePublic: z.literal("on", { message: "You must acknowledge that submissions are public." }),
});
export type DisputeSubmissionInput = z.infer<typeof disputeSubmissionSchema>;

export const projectSuggestionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  officialUrl: publicUrl,
  category: z.enum(PROJECT_CATEGORIES),
  ecosystem: z.string().trim().min(2).max(60),
  description: z.string().trim().min(20).max(600),
  roadmapUrl: publicUrl,
  acknowledgePublic: z.literal("on", { message: "You must acknowledge that submissions are public." }),
});
export type ProjectSuggestionInput = z.infer<typeof projectSuggestionSchema>;

export const milestoneCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(5).max(140),
  commitmentParaphrase: z.string().trim().min(20).max(500),
  sourceUrl: publicUrl,
  claimDate: isoDate,
  deadline: isoDate,
  importance: z.enum(IMPORTANCE_TIERS),
});

export const statusChangeSchema = z.object({
  milestoneId: z.string().min(1),
  newStatus: z.enum(MILESTONE_STATUSES),
  reason: z.string().trim().min(10, "Provide a reason of at least 10 characters.").max(1000),
  evidenceIds: z.array(z.string()).default([]),
});

export const reviewDecisionSchema = z.object({
  evidenceId: z.string().min(1),
  decision: z.enum(["accepted", "rejected", "needs_clarification"]),
  reason: z.string().trim().min(10, "Provide a reason of at least 10 characters.").max(1000),
});

export const disputeResolutionSchema = z.object({
  disputeId: z.string().min(1),
  state: z.enum(["under_review", "resolved", "rejected"]),
  resolution: z.string().trim().min(10, "Provide a resolution note of at least 10 characters.").max(1500),
});

export const projectUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Slug must be lowercase letters, numbers and dashes."),
  description: z.string().trim().min(20).max(800),
  category: z.enum(PROJECT_CATEGORIES),
  ecosystem: z.string().trim().min(2).max(60),
  officialUrl: publicUrl,
  status: z.enum(["published", "draft", "archived"]),
});

export function formDataToObject(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  }
  return out;
}

export function flattenZodError(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

import { z } from "zod";
import { DEFAULT_NEUTRAL_THRESHOLD_PERCENT, SIGNALS_PER_PREDICTION, THESIS_MAX_LENGTH } from "../config";
import { BATTLE_STATUSES } from "./types";

export const directionSchema = z.enum(["bullish", "neutral", "bearish"]);

export const signalIdsSchema = z
  .array(z.string().min(1))
  .length(SIGNALS_PER_PREDICTION, `Select exactly ${SIGNALS_PER_PREDICTION} signals`)
  .refine((ids) => new Set(ids).size === ids.length, "Signals must be unique");

export const confidenceSchema = z.number().int().min(1).max(5);

export const thesisSchema = z
  .string()
  .trim()
  .max(THESIS_MAX_LENGTH, `Thesis must be ${THESIS_MAX_LENGTH} characters or fewer`)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const predictionInputSchema = z.object({
  battleId: z.string().min(1),
  direction: z.enum(["bullish", "neutral", "bearish"]),
  signalIds: signalIdsSchema,
  confidence: confidenceSchema,
  thesis: thesisSchema,
});

export type PredictionInput = z.infer<typeof predictionInputSchema>;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be 20 characters or fewer")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores")
  .transform((v) => v.toLowerCase());

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  bio: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  username: usernameSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid timestamp")
  .transform((v) => new Date(v).toISOString());

export const battleCreateSchema = z
  .object({
    assetId: z.string().min(1),
    title: z.string().trim().min(3).max(80).optional(),
    opensAt: isoDate,
    locksAt: isoDate,
    endsAt: isoDate,
    neutralThresholdPercent: z
      .number()
      .min(0)
      .max(25)
      .default(DEFAULT_NEUTRAL_THRESHOLD_PERCENT),
    aiProfileIds: z.array(z.string().min(1)).default([]),
    publish: z.boolean().default(false),
  })
  .refine((b) => Date.parse(b.locksAt) > Date.parse(b.opensAt), {
    message: "locksAt must be after opensAt",
    path: ["locksAt"],
  })
  .refine((b) => Date.parse(b.endsAt) >= Date.parse(b.locksAt), {
    message: "endsAt must be at or after locksAt",
    path: ["endsAt"],
  });

export type BattleCreateInput = z.infer<typeof battleCreateSchema>;

export const battleStatusSchema = z.enum(BATTLE_STATUSES as [string, ...string[]]);

export const battleTransitionSchema = z.object({
  battleId: z.string().min(1),
  action: z.enum(["publish", "lock", "settle", "void", "archive", "unarchive"]),
  reason: z.string().trim().max(240).optional(),
});

export const aiToggleSchema = z.object({
  battleId: z.string().min(1),
  aiProfileId: z.string().min(1),
  enabled: z.boolean(),
});

/** Structured validation of a prediction against a Battle at submission time. */
export function validatePredictionDeadline(input: {
  locksAt: string;
  opensAt: string;
  now: Date;
}): { ok: true } | { ok: false; reason: string } {
  const t = input.now.getTime();
  if (t < Date.parse(input.opensAt)) return { ok: false, reason: "This Round has not opened yet." };
  if (t >= Date.parse(input.locksAt)) return { ok: false, reason: "This Round is locked. Calls are no longer accepted." };
  return { ok: true };
}

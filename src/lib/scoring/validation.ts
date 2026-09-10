import { z } from "zod";
import { PICK_ROLES, type LineupPick } from "@/lib/types";

export const ENERGY_TOTAL = 100;
export const THESIS_MAX = 240;

export const pickSchema = z.object({
  role: z.enum(["leader", "challenger", "wildcard"]),
  narrativeId: z.string().min(1),
  energy: z.number().int().min(0).max(ENERGY_TOTAL),
});

export const lineupInputSchema = z
  .object({
    raceId: z.string().min(1),
    thesis: z.string().trim().max(THESIS_MAX).optional().default(""),
    picks: z.array(pickSchema).length(3),
  })
  .superRefine((val, ctx) => {
    const problems = validatePicks(val.picks);
    for (const p of problems) ctx.addIssue({ code: "custom", message: p, path: ["picks"] });
  });

export type LineupInput = z.infer<typeof lineupInputSchema>;

/** Pure structural validation of picks — reused by the client, server, and tests. */
export function validatePicks(picks: LineupPick[]): string[] {
  const errors: string[] = [];
  if (picks.length !== 3) errors.push("A lineup needs exactly three picks.");
  const roles = new Set(picks.map((p) => p.role));
  for (const role of PICK_ROLES) {
    if (!roles.has(role)) errors.push(`Missing ${role} pick.`);
  }
  if (roles.size !== picks.length) errors.push("Each role may be used only once.");
  const narratives = new Set(picks.map((p) => p.narrativeId));
  if (narratives.size !== picks.length) errors.push("Choose three different narratives.");
  for (const p of picks) {
    if (!Number.isInteger(p.energy) || p.energy < 0) errors.push("Energy values must be non-negative integers.");
  }
  const total = picks.reduce((s, p) => s + p.energy, 0);
  if (total !== ENERGY_TOTAL) errors.push(`Energy must total exactly ${ENERGY_TOTAL} (currently ${total}).`);
  return errors;
}

/** Deadline check: a lineup may only be locked strictly before the Race locks. */
export function isBeforeDeadline(nowIso: string, locksAtIso: string): boolean {
  const now = Date.parse(nowIso);
  const locks = Date.parse(locksAtIso);
  if (!Number.isFinite(now) || !Number.isFinite(locks)) return false;
  return now < locks;
}

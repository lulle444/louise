"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, AdminError } from "@/lib/auth/session";
import { getProvider, newId } from "@/lib/store";
import { StoreError } from "@/lib/store/types";
import { lockAiLineups } from "@/lib/services/ai-lineups";
import { settleRace, voidRace } from "@/lib/services/settlement";
import { takeRaceSnapshot } from "@/lib/services/snapshots";
import { redirect, unstable_rethrow } from "next/navigation";
import { isDemoMode } from "@/lib/config";

function back(msg: string, ok = true): never {
  revalidatePath("/", "layout");
  redirect(`/admin?${ok ? "ok" : "error"}=${encodeURIComponent(msg)}`);
}

async function guard() {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) redirect("/admin");
    throw e;
  }
}

function handle(e: unknown): never {
  unstable_rethrow(e); // let Next.js redirect() propagate
  if (e instanceof StoreError || e instanceof Error) back(e.message, false);
  back("Unknown error", false);
}

const raceSchema = z.object({
  name: z.string().trim().min(3).max(80),
  locksAt: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});

export async function createRaceAction(formData: FormData) {
  const { store, viewer } = await guard();
  const parsed = raceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(parsed.error.issues[0].message, false);
  try {
    const iso = (v: string) => new Date(v).toISOString();
    const race = await store.createRace({ name: parsed.data.name, locksAt: iso(parsed.data.locksAt), startsAt: iso(parsed.data.startsAt), endsAt: iso(parsed.data.endsAt) }, { id: viewer.id, label: viewer.displayName });
    back(`Created ${race.name} as draft`);
  } catch (e) {
    handle(e);
  }
}

export async function raceTransitionAction(formData: FormData) {
  const { store, viewer } = await guard();
  const raceId = String(formData.get("raceId") ?? "");
  const action = String(formData.get("action") ?? "");
  const actor = { id: viewer.id, label: viewer.displayName };
  const now = new Date().toISOString();
  try {
    const race = await store.getRace(raceId);
    if (!race) back("Race not found", false);
    const provider = await getProvider();
    switch (action) {
      case "publish": {
        if (race.status !== "draft") back("Only drafts can be published", false);
        await takeRaceSnapshot(store, provider, race, "reference", race.locksAt, newId);
        await takeRaceSnapshot(store, provider, race, "prelock", race.locksAt, newId);
        await store.setRaceStatus(raceId, "published", actor);
        back(`Published ${race.name} with reference and pre-lock snapshots`);
      }
      // falls through only via redirect
      case "lock-ai": {
        if (race.status !== "published") back("AI lineups lock for published Races only", false);
        const lineups = await lockAiLineups(store, race, now, newId);
        back(`${lineups.length} AI lineups locked for ${race.name}`);
      }
      case "lock": {
        if (race.status !== "published") back("Only published Races can go live", false);
        await lockAiLineups(store, race, now, newId).catch(() => undefined);
        await store.setRaceStatus(raceId, "live", actor);
        back(`${race.name} is live`);
      }
      case "snapshot": {
        if (race.status !== "live") back("Snapshots are taken for live Races", false);
        const at = Date.parse(now) >= Date.parse(race.endsAt) ? race.endsAt : now;
        const kind = Date.parse(now) >= Date.parse(race.endsAt) ? "final" : "interval";
        await takeRaceSnapshot(store, provider, race, kind, at, newId);
        back(`${kind} snapshot taken for ${race.name}`);
      }
      case "settle": {
        if (race.status !== "live") back("Only live Races can be settled", false);
        if (Date.parse(now) < Date.parse(race.endsAt) && !isDemoMode()) back("The Race window has not ended yet", false);
        const snaps = await store.listSnapshots(raceId);
        if (!snaps.some((s) => s.kind === "final")) {
          await takeRaceSnapshot(store, provider, race, "final", race.endsAt, newId);
        }
        const outcome = await settleRace(store, raceId, actor, now, newId);
        const early = Date.parse(now) < Date.parse(race.endsAt) ? " (fast-forward: settled before the window ended using simulated data)" : "";
        back(outcome.alreadySettled ? `${race.name} was already settled` : `${race.name} settled: ${outcome.results.length} results, ${outcome.xpAdded.length} XP entries, ${outcome.badgesAdded.length} badges${early}`);
      }
      case "void": {
        const reason = String(formData.get("reason") ?? "Voided by admin").slice(0, 200) || "Voided by admin";
        await voidRace(store, raceId, reason, actor);
        back(`${race.name} voided`);
      }
      case "archive": {
        if (!["settled", "void"].includes(race.status)) back("Only settled or void Races can be archived", false);
        await store.setRaceStatus(raceId, "archived", actor);
        back(`${race.name} archived`);
      }
      case "feature": {
        await store.setRaceFeatured(raceId, !race.featured, actor);
        back(`${race.name} ${race.featured ? "un-featured" : "featured"}`);
      }
      default:
        back("Unknown action", false);
    }
  } catch (e) {
    handle(e);
  }
}

const narrativeSchema = z.object({
  narrativeId: z.string().min(1),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(400),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  active: z.string().optional(),
});

export async function updateNarrativeAction(formData: FormData) {
  const { store, viewer } = await guard();
  const parsed = narrativeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(parsed.error.issues[0].message, false);
  try {
    await store.updateNarrative(parsed.data.narrativeId, { name: parsed.data.name, description: parsed.data.description, accentColor: parsed.data.accentColor, active: parsed.data.active === "on" }, { id: viewer.id, label: viewer.displayName });
    back(`Updated ${parsed.data.name}`);
  } catch (e) {
    handle(e);
  }
}

export async function updateConstituentsAction(formData: FormData) {
  const { store, viewer } = await guard();
  const narrativeId = String(formData.get("narrativeId") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 200) || "Updated constituents";
  const raw = String(formData.get("constituents") ?? "");
  const rows = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [symbol, name, weight] = l.split(",").map((s) => s.trim());
      return { symbol: symbol?.toUpperCase(), name: name || symbol, weight: weight ? Number(weight) : NaN };
    });
  if (rows.length < 2 || rows.some((r) => !r.symbol)) back("Provide at least two constituents as SYMBOL,Name[,weight] lines", false);
  const hasWeights = rows.every((r) => Number.isFinite(r.weight) && r.weight > 0);
  const total = hasWeights ? rows.reduce((s, r) => s + r.weight, 0) : rows.length;
  const constituents = rows.map((r) => ({ assetId: `ast_${r.symbol.toLowerCase()}`, symbol: r.symbol, name: r.name, weight: (hasWeights ? r.weight : 1) / total }));
  try {
    const v = await store.createConstituentVersion(narrativeId, constituents, note, { id: viewer.id, label: viewer.displayName });
    back(`Constituent version ${v.version} created`);
  } catch (e) {
    handle(e);
  }
}

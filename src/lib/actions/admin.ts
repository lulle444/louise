"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRepository } from "../data";
import { getMarketDataProvider } from "../market";
import { getViewer } from "../auth/session";
import { aiToggleSchema, battleCreateSchema, battleTransitionSchema } from "../domain/validation";
import { createBattle, publishBattle } from "../services/lifecycle";
import { settleBattle, voidBattle, findAssetForBattle } from "../services/settlement";
import { runMaintenanceNow } from "../services/maintenance";

export interface AdminActionState {
  ok: boolean;
  message: string;
}

async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer || !viewer.isAdmin) throw new Error("Admin access required");
  return viewer;
}

function revalidateAll(battleId?: string) {
  revalidatePath("/admin");
  revalidatePath("/arena");
  revalidatePath("/");
  revalidatePath("/humans-vs-ai");
  revalidatePath("/leaderboard");
  if (battleId) revalidatePath(`/arena/${battleId}`);
}

export async function createBattleAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  let viewer;
  try {
    viewer = await requireAdmin();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  const raw = {
    assetId: formData.get("assetId"),
    title: formData.get("title") || undefined,
    opensAt: formData.get("opensAt"),
    locksAt: formData.get("locksAt"),
    endsAt: formData.get("endsAt"),
    neutralThresholdPercent: Number(formData.get("neutralThresholdPercent") ?? 0.5),
    aiProfileIds: formData.getAll("aiProfileIds").map(String),
    publish: formData.get("publish") === "on",
  };
  const parsed = battleCreateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  try {
    const repo = await getRepository();
    const assets = await repo.listAssets();
    const asset = assets.find((a) => a.id === parsed.data.assetId);
    if (!asset) return { ok: false, message: "Unknown asset" };
    const battle = await createBattle(repo, getMarketDataProvider(), { ...parsed.data, asset, createdBy: viewer.id });
    revalidateAll(battle.id);
    return { ok: true, message: `${battle.status === "draft" ? "Draft created" : "Battle published"}: ${battle.title} (${battle.slug}).` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not create Battle." };
  }
}

export async function transitionBattleAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  let viewer;
  try {
    viewer = await requireAdmin();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  const parsed = battleTransitionSchema.safeParse({ battleId: formData.get("battleId"), action: formData.get("action"), reason: formData.get("reason") || undefined });
  if (!parsed.success) return { ok: false, message: "Invalid request" };
  const { battleId, action, reason } = parsed.data;
  try {
    const repo = await getRepository();
    const provider = getMarketDataProvider();
    const battle = await repo.getBattle(battleId);
    if (!battle) return { ok: false, message: "Battle not found" };
    switch (action) {
      case "publish": {
        const asset = await findAssetForBattle(repo, battle);
        const updated = await publishBattle(repo, provider, battle, asset, viewer.id);
        revalidateAll(battleId);
        return { ok: true, message: `Published as ${updated.status}.` };
      }
      case "lock": {
        if (!["upcoming", "open"].includes(battle.status)) return { ok: false, message: `Cannot lock a ${battle.status} Battle.` };
        const now = new Date().toISOString();
        await repo.updateBattle(battleId, { status: "locked", locksAt: now });
        await repo.appendAudit({ actorId: viewer.id, action: "battle.lock", targetType: "battle", targetId: battleId, details: { locksAt: now, reason: reason ?? null } });
        revalidateAll(battleId);
        return { ok: true, message: "Battle locked early; no further predictions accepted." };
      }
      case "settle": {
        const result = await settleBattle(repo, provider, battleId, { source: "admin", actorId: viewer.id });
        revalidateAll(battleId);
        return { ok: result.status === "settled" || result.status === "already-settled", message: result.message };
      }
      case "void": {
        await voidBattle(repo, battleId, { actorId: viewer.id, reason: reason ?? "Voided by admin" });
        revalidateAll(battleId);
        return { ok: true, message: "Battle voided. Predictions are excluded from accuracy." };
      }
      case "archive": {
        if (!["settled", "void", "draft"].includes(battle.status)) return { ok: false, message: "Only settled, void or draft Battles can be archived." };
        await repo.updateBattle(battleId, { status: "archived" });
        await repo.appendAudit({ actorId: viewer.id, action: "battle.archive", targetType: "battle", targetId: battleId, details: { previous: battle.status } });
        revalidateAll(battleId);
        return { ok: true, message: "Battle archived." };
      }
      case "unarchive": {
        if (battle.status !== "archived") return { ok: false, message: "Battle is not archived." };
        const restored = battle.outcome ? "settled" : "void";
        await repo.updateBattle(battleId, { status: restored });
        await repo.appendAudit({ actorId: viewer.id, action: "battle.unarchive", targetType: "battle", targetId: battleId, details: { restored } });
        revalidateAll(battleId);
        return { ok: true, message: `Battle restored as ${restored}.` };
      }
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Action failed." };
  }
  return { ok: false, message: "Unknown action" };
}

export async function toggleAIProfileAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  let viewer;
  try {
    viewer = await requireAdmin();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  const parsed = aiToggleSchema.safeParse({ battleId: formData.get("battleId"), aiProfileId: formData.get("aiProfileId"), enabled: formData.get("enabled") === "true" });
  if (!parsed.success) return { ok: false, message: "Invalid request" };
  try {
    const repo = await getRepository();
    const battle = await repo.getBattle(parsed.data.battleId);
    if (!battle) return { ok: false, message: "Battle not found" };
    if (["settling", "settled", "void", "archived"].includes(battle.status)) return { ok: false, message: "AI profiles cannot change after settlement." };
    const existing = await repo.listAIPredictions({ battleId: battle.id, aiProfileId: parsed.data.aiProfileId });
    if (!parsed.data.enabled && existing.length > 0) return { ok: false, message: "This profile has already locked a forecast for the Battle and cannot be removed." };
    const ids = new Set(battle.aiProfileIds);
    if (parsed.data.enabled) ids.add(parsed.data.aiProfileId);
    else ids.delete(parsed.data.aiProfileId);
    await repo.updateBattle(battle.id, { aiProfileIds: [...ids] });
    await repo.appendAudit({ actorId: viewer.id, action: "battle.ai_toggle", targetType: "battle", targetId: battle.id, details: { aiProfileId: parsed.data.aiProfileId, enabled: parsed.data.enabled } });
    revalidateAll(battle.id);
    return { ok: true, message: `AI profile ${parsed.data.enabled ? "enabled" : "disabled"}.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Action failed." };
  }
}

const overrideSchema = z.object({
  battleId: z.string().min(1),
  price: z.number().positive().finite(),
  reason: z.string().trim().min(3).max(240),
});

export async function settleWithOverrideAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  let viewer;
  try {
    viewer = await requireAdmin();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  const parsed = overrideSchema.safeParse({ battleId: formData.get("battleId"), price: Number(formData.get("price")), reason: formData.get("reason") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const repo = await getRepository();
    const battle = await repo.getBattle(parsed.data.battleId);
    if (!battle) return { ok: false, message: "Battle not found" };
    const result = await settleBattle(repo, getMarketDataProvider(), battle.id, {
      source: "admin-override",
      actorId: viewer.id,
      endPriceOverride: { price: parsed.data.price, at: battle.endsAt, reason: parsed.data.reason },
    });
    revalidateAll(battle.id);
    return { ok: result.status === "settled", message: result.message };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Action failed." };
  }
}

export async function runMaintenanceAction(_prev: AdminActionState, _formData: FormData): Promise<AdminActionState> {
  let viewer;
  try {
    viewer = await requireAdmin();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  try {
    const report = await runMaintenanceNow("admin", viewer.id);
    revalidateAll();
    const parts = [
      `${report.scheduled.length} scheduled`,
      `${report.opened.length} opened`,
      `${report.settled.length} settled${report.settled.length ? ` (${report.settled.map((s) => s.status).join(", ")})` : ""}`,
    ];
    if (report.errors.length) parts.push(`errors: ${report.errors.join(" | ")}`);
    return { ok: report.errors.length === 0, message: parts.join(" · ") };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Maintenance failed." };
  }
}

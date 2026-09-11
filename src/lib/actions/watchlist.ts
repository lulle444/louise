"use server";

import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/data";
import { canAccessWatchlist, hasPermission } from "@/lib/domain/auth";
import { getSessionUser } from "@/lib/session";
import type { ActionState } from "./types";

export async function toggleWatch(projectId: string, path: string): Promise<ActionState & { watching?: boolean }> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "manage_own_watchlist")) return { ok: false, message: "Sign in to follow projects." };
  const ds = await getDataSource();
  const list = await ds.getWatchlistForUser(user.id);
  if (!list || !canAccessWatchlist(user, list.watchlist, "write")) return { ok: false, message: "You cannot modify this watchlist." };
  const result = await ds.toggleWatchlistItem(user.id, projectId);
  revalidatePath(path);
  revalidatePath("/watchlist");
  return { ok: true, watching: result.watching };
}

export async function setWatchlistVisibility(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "manage_own_watchlist")) return;
  const ds = await getDataSource();
  await ds.setWatchlistVisibility(user.id, formData.get("isPublic") === "true");
  revalidatePath("/watchlist");
  revalidatePath(`/profile/${user.username}`);
}

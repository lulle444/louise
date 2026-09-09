import "server-only";
import { cache } from "react";
import { getAdminEmails, isDemoMode } from "../config";
import type { Viewer } from "../domain/types";
import { createSupabaseServerClient } from "../supabase/server";
import { getRepository } from "../data";
import { demoSessionToViewer, readDemoSession } from "./demo-session";

/** Current viewer (cached per request). Null for anonymous visitors. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (isDemoMode()) {
    const session = await readDemoSession();
    if (!session) return null;
    // Refresh admin flag / display name from the seeded profile when available.
    const repo = await getRepository();
    const profile = await repo.getProfileById(session.id);
    const viewer = demoSessionToViewer(session);
    if (profile) return { ...viewer, username: profile.username, displayName: profile.displayName, isAdmin: profile.isAdmin };
    return viewer;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const repo = await getRepository();
    const profile = await repo.getProfileById(user.id);
    const email = user.email?.toLowerCase() ?? null;
    const isAdmin = Boolean(profile?.isAdmin) || (email !== null && getAdminEmails().includes(email));
    return {
      id: user.id,
      username: profile?.username ?? (email ? email.split("@")[0] : user.id.slice(0, 8)),
      displayName: profile?.displayName ?? profile?.username ?? "Analyst",
      email,
      isAdmin,
      isGuest: false,
    };
  } catch {
    return null;
  }
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Sign in required");
  return viewer;
}

/** Server-side admin check. Never trust client-provided flags. */
export async function isAdminViewer(): Promise<boolean> {
  const viewer = await getViewer();
  return Boolean(viewer?.isAdmin);
}

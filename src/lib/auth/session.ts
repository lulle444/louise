import "server-only";
import { cache } from "react";
import { getAdminEmails, hasSupabaseConfig, isDemoMode } from "@/lib/config";
import { getBaseStore } from "@/lib/store";
import { GuestOverlayStore } from "@/lib/store/guest-overlay";
import type { DataStore } from "@/lib/store/types";
import type { Profile, Viewer } from "@/lib/types";
import { readGuest } from "./guest";
import { createUserClient } from "@/lib/supabase/server";

export interface Session {
  viewer: Viewer | null;
  /** Store scoped to the viewer (guest lineups overlaid in Demo Mode). */
  store: DataStore;
  guest: GuestOverlayStore | null;
  demo: boolean;
}

/**
 * Resolve the current viewer and a viewer-scoped store. Cached per request.
 */
export const getSession = cache(async (): Promise<Session> => {
  const base = await getBaseStore();
  const demo = isDemoMode();

  if (hasSupabaseConfig() && !demo) {
    const client = await createUserClient();
    const { data } = client ? await client.auth.getUser() : { data: { user: null } };
    const user = data.user;
    if (!user) return { viewer: null, store: base, guest: null, demo };
    let profile: Profile | null = await base.getProfile(user.id);
    if (!profile) {
      profile = await base.upsertProfile({
        id: user.id,
        username: (user.user_metadata?.username as string | undefined) || `player-${user.id.slice(0, 6)}`,
        displayName: (user.user_metadata?.display_name as string | undefined) || "New Forecaster",
        avatarSeed: user.id,
        bio: null,
        createdAt: user.created_at,
        isDemo: false,
      });
    }
    const email = user.email?.toLowerCase() ?? null;
    return {
      viewer: {
        id: user.id,
        username: profile.username,
        displayName: profile.displayName,
        email,
        isAdmin: Boolean(email && getAdminEmails().includes(email)),
        isGuest: false,
      },
      store: base,
      guest: null,
      demo,
    };
  }

  const guestState = await readGuest();
  if (!guestState) return { viewer: null, store: base, guest: null, demo: true };
  const overlay = new GuestOverlayStore(base, guestState);
  return {
    viewer: {
      id: guestState.id,
      username: guestState.username,
      displayName: guestState.displayName,
      email: null,
      isAdmin: guestState.admin,
      isGuest: true,
    },
    store: overlay,
    guest: overlay,
    demo: true,
  };
});

export async function requireAdmin(): Promise<Session & { viewer: Viewer }> {
  const session = await getSession();
  if (!session.viewer || !session.viewer.isAdmin) {
    throw new AdminError();
  }
  return session as Session & { viewer: Viewer };
}

export class AdminError extends Error {
  constructor() {
    super("Admin access required");
  }
}

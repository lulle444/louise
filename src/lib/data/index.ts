import "server-only";
import { isDemoMode } from "../config";
import { getDemoState } from "./demo";
import { DemoRepository } from "./demo/repository";
import type { ArenaRepository } from "./repository";
import { SupabaseRepository } from "./supabase/repository";
import { readDemoOverlay, readDemoSession, guestProfile } from "../auth/demo-session";
import { createSupabaseAdminClient, createSupabaseServerClient } from "../supabase/server";

/**
 * Resolve the repository for the current request.
 * Demo Mode: in-memory seeded state + the viewer's cookie overlay.
 * Production: Supabase (service role for reads/scoring, user session for locking).
 */
export async function getRepository(): Promise<ArenaRepository> {
  if (isDemoMode()) {
    const [state, overlay, session] = await Promise.all([getDemoState(), readDemoOverlay(), readDemoSession()]);
    const repo = new DemoRepository(state, overlay);
    // Guests exist only in their own session; register them so lookups succeed.
    if (session?.isGuest && !overlay.profiles.some((p) => p.id === session.id)) {
      repo.ensureProfile(guestProfile(session));
    }
    return repo;
  }
  const admin = createSupabaseAdminClient();
  const user = await createSupabaseServerClient();
  return new SupabaseRepository(admin, user);
}

export { DuplicatePredictionError, NotFoundError } from "./repository";
export type { ArenaRepository } from "./repository";

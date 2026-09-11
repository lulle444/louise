import { cookies } from "next/headers";
import { cache } from "react";
import { getConfig } from "@/lib/config";
import { DEMO_USERS } from "@/lib/demo/spec";
import { roleForEmail } from "@/lib/domain/auth";
import type { SessionUser, UserRole } from "@/lib/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEMO_SESSION_COOKIE = "shiptrace_demo_session";

export type DemoPersona = "guest" | "moderator" | "admin";

const PERSONA_TO_USERNAME: Record<DemoPersona, string> = {
  guest: "demo-guest",
  moderator: "mara-okafor",
  admin: "demo-admin",
};

export function demoUserForPersona(persona: string | undefined): SessionUser | null {
  if (!persona || !(persona in PERSONA_TO_USERNAME)) return null;
  const username = PERSONA_TO_USERNAME[persona as DemoPersona];
  const spec = DEMO_USERS.find((u) => u.username === username);
  if (!spec) return null;
  return { id: spec.id, email: null, username: spec.username, displayName: spec.displayName, role: spec.role, isDemo: true };
}

/** Resolve the current user (demo cookie persona, or Supabase auth + profile). Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const config = getConfig();
  const cookieStore = await cookies();
  if (config.demoMode) {
    return demoUserForPersona(cookieStore.get(DEMO_SESSION_COOKIE)?.value);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  const baseRole = (profile?.role as UserRole | undefined) ?? "user";
  const emailRole = roleForEmail(user.email, config.adminEmails);
  const role: UserRole = emailRole === "admin" ? "admin" : baseRole;
  return {
    id: user.id,
    email: user.email ?? null,
    username: profile?.username ?? user.email?.split("@")[0] ?? user.id.slice(0, 8),
    displayName: profile?.display_name ?? user.email ?? "Member",
    role,
    isDemo: false,
  };
});

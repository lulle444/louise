"use server";

import { redirect } from "next/navigation";
import { getAppUrl, isDemoMode } from "../config";
import { loginSchema, signupSchema } from "../domain/validation";
import { getDemoState } from "../data/demo";
import { DEMO_ADMIN_USERNAME, DEMO_ANALYST_USERNAME } from "../data/demo/seed";
import { clearDemoSession, writeDemoOverlay, writeDemoSession, guestProfile, type DemoSession } from "../auth/demo-session";
import { emptyOverlay } from "../data/demo/repository";
import { createSupabaseServerClient } from "../supabase/server";
import { hashString } from "../domain/random";

export interface AuthState {
  error?: string;
  message?: string;
}

function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/arena";
}

export async function demoSignIn(formData: FormData): Promise<void> {
  if (!isDemoMode()) redirect("/login");
  const kind = String(formData.get("kind") ?? "guest");
  const next = safeNext(formData.get("next"));
  const state = await getDemoState();
  let session: DemoSession;
  if (kind === "analyst" || kind === "admin") {
    const username = kind === "admin" ? DEMO_ADMIN_USERNAME : DEMO_ANALYST_USERNAME;
    const profile = state.profiles.find((p) => p.username === username);
    if (!profile) redirect("/login?error=demo");
    session = { id: profile.id, username: profile.username, displayName: profile.displayName, isAdmin: profile.isAdmin, isGuest: false };
    await writeDemoSession(session);
    await writeDemoOverlay(emptyOverlay());
  } else {
    const suffix = (hashString(`${Date.now()}:${Math.random()}`) >>> 0).toString(16).slice(0, 6);
    session = { id: `guest-${suffix}`, username: `guest_${suffix}`, displayName: `Guest ${suffix.toUpperCase()}`, isAdmin: false, isGuest: true };
    await writeDemoSession(session);
    await writeDemoOverlay({ ...emptyOverlay(), profiles: [guestProfile(session)] });
  }
  redirect(next);
}

export async function signOut(): Promise<void> {
  if (isDemoMode()) {
    await clearDemoSession();
  } else {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (isDemoMode()) return { error: "Demo Mode is active. Use the demo sign-in options." };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect(safeNext(formData.get("next")));
}

export async function signUpWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (isDemoMode()) return { error: "Demo Mode is active. Use the demo sign-in options." };
  const parsed = signupSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), username: formData.get("username") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createSupabaseServerClient();
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { username: parsed.data.username, display_name: parsed.data.username },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(next);
  return { message: "Check your inbox to confirm your email, then sign in." };
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import { flattenZodError } from "@/lib/domain/validation";
import { DEMO_SESSION_COOKIE, demoUserForPersona } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function demoSignIn(formData: FormData): Promise<void> {
  const config = getConfig();
  if (!config.demoMode) redirect("/login");
  const persona = String(formData.get("persona") ?? "");
  const user = demoUserForPersona(persona);
  if (!user) redirect("/login?error=unknown-persona");
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, persona, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const config = getConfig();
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
  if (!config.demoMode) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }
  redirect("/");
}

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

export async function signInWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const config = getConfig();
  if (config.demoMode) return { ok: false, message: "Email sign-in is unavailable in Demo Mode. Use a demo persona instead." };
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error) };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Authentication is not configured." };
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { ok: false, message: "Sign-in failed. Check your email and password." };
  redirect(safeNext(parsed.data.next));
}

const signUpSchema = credentialsSchema.extend({
  username: z.string().trim().regex(/^[a-z0-9-]{3,32}$/, "Username: 3–32 lowercase letters, numbers or dashes."),
  displayName: z.string().trim().min(2).max(60),
});

export async function signUpWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const config = getConfig();
  if (config.demoMode) return { ok: false, message: "Sign-up is unavailable in Demo Mode. Use a demo persona instead." };
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: flattenZodError(parsed.error) };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Authentication is not configured." };
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { username: parsed.data.username, display_name: parsed.data.displayName } },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Check your inbox to confirm your email, then sign in." };
}

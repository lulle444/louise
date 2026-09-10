"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hasSupabaseConfig, isDemoMode } from "@/lib/config";
import { clearGuest, newGuestState, readGuest, writeGuest } from "@/lib/auth/guest";
import { createUserClient } from "@/lib/supabase/server";

function safeNext(next: FormDataEntryValue | null): string {
  const v = typeof next === "string" ? next : "/";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export async function continueAsGuest(formData: FormData): Promise<void> {
  if (!isDemoMode()) redirect("/login?error=Guest%20sessions%20are%20only%20available%20in%20Demo%20Mode");
  const existing = await readGuest();
  await writeGuest(existing ?? newGuestState(false));
  redirect(safeNext(formData.get("next")));
}

export async function enterDemoAdmin(formData: FormData): Promise<void> {
  if (!isDemoMode()) redirect("/login?error=Demo%20admin%20is%20only%20available%20in%20Demo%20Mode");
  const existing = await readGuest();
  const state = existing ?? newGuestState(true);
  state.admin = true;
  if (!existing) state.displayName = "Demo Admin";
  await writeGuest(state);
  redirect(safeNext(formData.get("next")) === "/" ? "/admin" : safeNext(formData.get("next")));
}

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signInWithEmail(formData: FormData): Promise<void> {
  if (!hasSupabaseConfig()) redirect("/login?error=Supabase%20is%20not%20configured");
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const client = await createUserClient();
  const { error } = await client!.auth.signInWithPassword(parsed.data);
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(safeNext(formData.get("next")));
}

export async function signUpWithEmail(formData: FormData): Promise<void> {
  if (!hasSupabaseConfig()) redirect("/signup?error=Supabase%20is%20not%20configured");
  const schema = credentials.extend({
    username: z.string().regex(/^[a-z0-9._-]{3,32}$/, "Username: 3–32 lowercase letters, digits, dots, dashes or underscores"),
    displayName: z.string().trim().min(1).max(48),
  });
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) redirect(`/signup?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const client = await createUserClient();
  const { error } = await client!.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { username: parsed.data.username, display_name: parsed.data.displayName } },
  });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Check%20your%20inbox%20to%20confirm%20your%20email%2C%20then%20sign%20in.");
}

export async function signOut(): Promise<void> {
  if (hasSupabaseConfig() && !isDemoMode()) {
    const client = await createUserClient();
    await client?.auth.signOut();
  }
  await clearGuest();
  redirect("/");
}

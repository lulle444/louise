import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";

/** Supabase email confirmation / magic-link callback. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/rounds";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/rounds";
  if (isDemoMode() || !code) return NextResponse.redirect(new URL("/login", url.origin));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  return NextResponse.redirect(new URL(safeNext, url.origin));
}

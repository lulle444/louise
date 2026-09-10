import { NextResponse } from "next/server";
import { hasSupabaseConfig, isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, demoMode: isDemoMode(), supabaseConfigured: hasSupabaseConfig(), time: new Date().toISOString() });
}

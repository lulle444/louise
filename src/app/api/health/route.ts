import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseCredentials, isDemoMode } from "@/lib/config";
import { createClient } from "@supabase/supabase-js";
import { getMarketDataProvider } from "@/lib/market";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { getMaintenanceStatus } from "@/lib/services/maintenance";
import { getRepository } from "@/lib/data";
import { effectiveStatus } from "@/lib/domain/settlement";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getMarketDataProvider();
  let price: { ok: boolean; source: string; error?: string } = { ok: false, source: provider.name };
  try {
    const p = await provider.getCurrentPrice("BTC");
    price = { ok: true, source: p.source };
  } catch (err) {
    price = { ok: false, source: provider.name, error: err instanceof Error ? err.message : "unknown" };
  }

  // Database connectivity: host only (never keys), plus whether the schema is present.
  let database: Record<string, unknown> = { configured: false };
  if (!isDemoMode() && hasSupabaseCredentials()) {
    let host = "invalid-url";
    try {
      host = new URL(getSupabaseUrl() ?? "").host;
    } catch {
      host = "invalid-url";
    }
    try {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin.from("assets").select("id").limit(1);
      database = {
        configured: true,
        host,
        serviceRoleKey: hasServiceRoleKey(),
        reachable: !error,
        schemaSeeded: !error && (data?.length ?? 0) > 0,
        error: error?.message,
      };
    } catch (err) {
      database = { configured: true, host, serviceRoleKey: hasServiceRoleKey(), reachable: false, error: err instanceof Error ? err.message : "unknown" };
    }
    // Public (anon/publishable) key check: this is the key the sign-up form uses.
    const anon = getSupabaseAnonKey() ?? "";
    try {
      const client = createClient(getSupabaseUrl() ?? "", anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await client.from("assets").select("id").limit(1);
      database = { ...database, publicKey: { prefix: `${anon.slice(0, 18)}…`, length: anon.length, ok: !error, error: error?.message } };
    } catch (err) {
      database = { ...database, publicKey: { prefix: `${anon.slice(0, 18)}…`, length: anon.length, ok: false, error: err instanceof Error ? err.message : "unknown" } };
    }
  }

  let battles: Record<string, number> | { error: string } = {};
  try {
    const repo = await getRepository();
    const all = await repo.listBattles({ includeUnpublished: true });
    const now = new Date();
    for (const b of all) {
      const st = effectiveStatus(b, now);
      battles[st] = (battles[st] ?? 0) + 1;
    }
  } catch (err) {
    battles = { error: err instanceof Error ? err.message : "unknown" };
  }

  return NextResponse.json({
    ok: true,
    demoMode: isDemoMode(),
    battles,
    maintenance: getMaintenanceStatus(),
    supabaseConfigured: hasSupabaseCredentials(),
    database,
    marketData: { ...price, simulated: provider.isMock },
    time: new Date().toISOString(),
  });
}

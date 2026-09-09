import { NextResponse } from "next/server";
import { hasSupabaseCredentials, isDemoMode } from "@/lib/config";
import { getMarketDataProvider } from "@/lib/market";

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
  return NextResponse.json({
    ok: true,
    demoMode: isDemoMode(),
    supabaseConfigured: hasSupabaseCredentials(),
    marketData: { ...price, simulated: provider.isMock },
    time: new Date().toISOString(),
  });
}

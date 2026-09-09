import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getMarketDataProvider } from "@/lib/market";
import { runScheduledMaintenance } from "@/lib/services/cron";

export const dynamic = "force-dynamic";

/**
 * Scheduled settlement (Vercel Cron compatible). Protected by CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (header !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const repo = await getRepository();
    const report = await runScheduledMaintenance(repo, getMarketDataProvider(), "cron");
    return NextResponse.json({ ok: report.errors.length === 0, ranAt: new Date().toISOString(), ...report });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Settlement failed" }, { status: 500 });
  }
}

export const POST = GET;

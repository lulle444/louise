import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/auth/cron";
import { runSnapshotJob } from "@/lib/services/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const report = await runSnapshotJob();
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const POST = GET;

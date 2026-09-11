import { NextResponse } from "next/server";
import { authorizeCron, runScoresJob } from "@/lib/services/cron";

export const dynamic = "force-dynamic";

/** Vercel cron entrypoint. Requires `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runScoresJob();
  return NextResponse.json(result, { status: result.errors.length ? 207 : 200 });
}

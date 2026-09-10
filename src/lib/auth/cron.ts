import "server-only";
import { getCronSecret } from "@/lib/config";

/** Cron endpoints require `Authorization: Bearer <CRON_SECRET>` (Vercel sends this automatically). */
export function isAuthorizedCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

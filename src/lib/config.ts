/** Environment + runtime configuration. */

export const APP_NAME = "META RACE";
export const APP_TAGLINE = "Predict the next crypto narrative before the crowd.";

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Demo Mode is enabled when explicitly requested, or automatically whenever the
 * Supabase credentials are missing so that every core route stays usable.
 */
export function isDemoMode(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag === "false" && hasSupabaseConfig()) return false;
  if (flag === "true") return true;
  return !hasSupabaseConfig();
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}

export const DISCLAIMER =
  "META RACE is an educational forecasting game using virtual points. It does not execute trades or provide financial advice. Crypto markets are volatile, and past game performance does not predict future results.";

/** Environment + runtime configuration. */

export const APP_NAME = "MEGASPRINT";
export const APP_TAGLINE = "Predict the next crypto narrative before the crowd.";
export const APP_SOCIAL_DESCRIPTION =
  "The next crypto narrative rarely announces itself. MEGASPRINT turns market rotation into a competitive race between humans, AI and the crowd.";
export const CANONICAL_URL = "https://www.megasprint.org";
export const X_HANDLE = "Megasprint__";
export const X_PROFILE_URL = `https://x.com/${X_HANDLE}`;

export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit && !explicit.includes("localhost")) return explicit;
  // Canonical public domain. Used for share links and the social card whenever
  // the app runs on Vercel without an explicit NEXT_PUBLIC_APP_URL.
  if (process.env.VERCEL) return CANONICAL_URL;
  return explicit || "http://localhost:3000";
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
  "MEGASPRINT is an educational forecasting game using virtual points. It does not execute trades or provide financial advice. Crypto markets are volatile, and past game performance does not predict future results.";

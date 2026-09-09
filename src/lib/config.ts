/**
 * Central runtime configuration.
 *
 * Demo Mode is enabled when NEXT_PUBLIC_DEMO_MODE=true OR when Supabase
 * credentials are absent. In Demo Mode the app runs entirely on
 * deterministic seeded data and a mock market-data provider so that the whole
 * core loop can be reviewed without external services.
 */

export const APP_NAME = "SIGNAL ARENA";
export const TAGLINE = "Pick your signals. Challenge the AI. Prove your edge.";
export const SUPPORTING_MESSAGE = "Humans vs AI. Who reads crypto markets best?";

export const DISCLAIMER =
  "SIGNAL ARENA is an educational forecasting game using virtual points. It does not execute trades or provide financial advice. Crypto markets are volatile, and past forecasting performance does not predict future results.";

/** Minimum valid settled predictions before a user is ranked on the leaderboard. */
export const MIN_RANKED_BATTLES = 5;

/** Minimum valid settled predictions before Signal DNA is computed. */
export const MIN_DNA_BATTLES = 5;

/** Minimum uses of a signal before it can be named "best signal". */
export const MIN_SIGNAL_USES = 3;

/** Minimum battles on an asset before it can be named "best asset". */
export const MIN_ASSET_BATTLES = 3;

export const THESIS_MAX_LENGTH = 240;
export const SIGNALS_PER_PREDICTION = 3;
export const DEFAULT_NEUTRAL_THRESHOLD_PERCENT = 0.5;

export function getSupabaseUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export function hasSupabaseCredentials(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/**
 * True when the app should run on seeded demo data.
 * Safe to call on both server and client (only NEXT_PUBLIC_* values are read).
 */
export function isDemoMode(): boolean {
  const flag = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "").trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return !hasSupabaseCredentials();
  return !hasSupabaseCredentials();
}

/** X (Twitter) handle without the @; override with NEXT_PUBLIC_X_HANDLE. */
export function getXHandle(): string {
  const v = (process.env.NEXT_PUBLIC_X_HANDLE ?? "").trim().replace(/^@/, "");
  return v || "signalarena";
}

export function getXUrl(): string {
  return `https://x.com/${getXHandle()}`;
}

export function getAppUrl(): string {
  const v = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (v) return v.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

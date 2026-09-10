/**
 * Central runtime configuration.
 *
 * Demo Mode is enabled when NEXT_PUBLIC_DEMO_MODE=true OR when Supabase
 * credentials are absent. In Demo Mode the app runs entirely on
 * deterministic seeded data and a mock market-data provider so that the whole
 * core loop can be reviewed without external services.
 */

export const APP_NAME = "Callscore";
export const TAGLINE = "Make the call. Beat the machines. Keep the score.";
export const SUPPORTING_MESSAGE = "Who reads crypto best: you, the crowd, or the machines?";

export const DISCLAIMER =
  "Callscore is an educational forecasting game using virtual points. It does not execute trades or provide financial advice. Crypto markets are volatile, and past forecasting performance does not predict future results.";

/** Minimum valid settled predictions before a user is ranked on the leaderboard. */
export const MIN_RANKED_BATTLES = 5;

/** Minimum valid settled predictions before Call Profile is computed. */
export const MIN_DNA_BATTLES = 5;

/** Minimum uses of a signal before it can be named "best signal". */
export const MIN_SIGNAL_USES = 3;

/** Minimum battles on an asset before it can be named "best asset". */
export const MIN_ASSET_BATTLES = 3;

/**
 * Season framing. Season 0 is the preview season (simulated market in Demo
 * Mode). The founding window grants the "Founding Caller" badge to anyone who
 * locks a forecast within the first days of the season.
 */
export interface SeasonInfo {
  number: number;
  name: string;
  startsAt: string;
  endsAt: string;
  foundingWindowEndsAt: string;
  isPreview: boolean;
}

export function getSeason(now: Date = new Date()): SeasonInfo {
  const start = process.env.NEXT_PUBLIC_SEASON_START?.trim();
  const startsAt = start && !Number.isNaN(Date.parse(start)) ? new Date(start) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const number = Number(process.env.NEXT_PUBLIC_SEASON_NUMBER ?? (isDemoMode() ? 0 : 1));
  const days = Number(process.env.NEXT_PUBLIC_SEASON_DAYS ?? 30);
  const foundingDays = Number(process.env.NEXT_PUBLIC_SEASON_FOUNDING_DAYS ?? 7);
  return {
    number,
    name: number === 0 ? "Preview Season" : `Season ${number}`,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + days * 86_400_000).toISOString(),
    foundingWindowEndsAt: new Date(startsAt.getTime() + foundingDays * 86_400_000).toISOString(),
    isPreview: number === 0 || isDemoMode(),
  };
}

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
  return v || "callscore";
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

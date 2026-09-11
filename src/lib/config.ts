/**
 * Runtime configuration. Missing integrations activate Demo Mode rather than
 * breaking the application.
 */
export interface AppConfig {
  demoMode: boolean;
  demoReason: string | null;
  appUrl: string;
  supabase: { url: string; anonKey: string; serviceRoleKey: string | null } | null;
  githubToken: string | null;
  websiteCheckSecret: string | null;
  cronSecret: string | null;
  adminEmails: string[];
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function getConfig(): AppConfig {
  const forcedDemo = (env("NEXT_PUBLIC_DEMO_MODE") ?? "").toLowerCase() === "true";
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const supabaseConfigured = !!supabaseUrl && !!supabaseAnon;
  const demoMode = forcedDemo || !supabaseConfigured;
  const demoReason = forcedDemo
    ? "NEXT_PUBLIC_DEMO_MODE=true"
    : !supabaseConfigured
      ? "Supabase environment variables are not configured"
      : null;
  return {
    demoMode,
    demoReason,
    appUrl: (env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/$/, ""),
    supabase: supabaseConfigured ? { url: supabaseUrl!, anonKey: supabaseAnon!, serviceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY") ?? null } : null,
    githubToken: env("GITHUB_TOKEN") ?? null,
    websiteCheckSecret: env("WEBSITE_CHECK_SECRET") ?? null,
    cronSecret: env("CRON_SECRET") ?? null,
    adminEmails: (env("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}

export function isDemoMode(): boolean {
  return getConfig().demoMode;
}

export const SITE = {
  name: "SHIPTRACE",
  tagline: "Crypto makes promises. SHIPTRACE checks what gets delivered.",
  description:
    "SHIPTRACE turns public crypto roadmaps into trackable commitments. Follow deadlines, inspect evidence, and compare documented delivery history across projects.",
  disclaimer:
    "SHIPTRACE tracks publicly available project commitments and evidence. A Ship Score is not an investment recommendation, security audit, legal conclusion, or guarantee of future delivery.",
} as const;

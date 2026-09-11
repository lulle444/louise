import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";

/** Cookie-aware Supabase client for Server Components, Route Handlers and Server Actions. */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getConfig();
  if (!config.supabase) return null;
  const cookieStore = await cookies();
  return createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes sessions instead.
        }
      },
    },
  });
}

/** Service-role client for trusted server-side writes. Never expose to the browser. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const config = getConfig();
  if (!config.supabase?.serviceRoleKey) return null;
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

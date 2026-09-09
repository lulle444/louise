import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "../config";

/** Session-scoped client: reads the user's auth cookies; RLS applies. */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) throw new Error("Supabase credentials are not configured");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component; the proxy refreshes sessions instead.
        }
      },
    },
  });
}

const g = globalThis as unknown as { __signalArenaAdminClient?: SupabaseClient };

/**
 * Service-role client for server-side settlement, AI writes and admin
 * operations. Never import this from client code.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (g.__signalArenaAdminClient) return g.__signalArenaAdminClient;
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const key = serviceKey || getSupabaseAnonKey();
  if (!url || !key) throw new Error("Supabase credentials are not configured");
  g.__signalArenaAdminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return g.__signalArenaAdminClient;
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

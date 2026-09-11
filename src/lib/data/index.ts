import { getConfig } from "@/lib/config";
import { DemoDataSource } from "./demo";
import type { DataSource } from "./types";

let supabaseSource: DataSource | null = null;

/**
 * Resolve the active data source. Demo Mode is used whenever it is forced or
 * Supabase is not configured, so the app never renders empty or broken.
 */
export async function getDataSource(): Promise<DataSource> {
  const config = getConfig();
  if (config.demoMode) return new DemoDataSource();
  if (!supabaseSource) {
    const { SupabaseDataSource } = await import("./supabase");
    supabaseSource = new SupabaseDataSource();
  }
  return supabaseSource;
}

export type { DataSource } from "./types";

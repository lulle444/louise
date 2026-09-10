import "server-only";
import { isDemoMode } from "../config";
import { getRepository } from "../data";
import { getMarketDataProvider } from "../market";
import { runScheduledMaintenance, type CronReport } from "./cron";

export interface MaintenanceStatus {
  lastRunAt: string | null;
  lastSource: string | null;
  lastReport: CronReport | null;
  lastError: string | null;
}

const g = globalThis as unknown as { __callscoreMaintenanceAt?: number; __callscoreMaintenanceRunning?: boolean; __callscoreMaintenanceStatus?: MaintenanceStatus };

export function getMaintenanceStatus(): MaintenanceStatus {
  return g.__callscoreMaintenanceStatus ?? { lastRunAt: null, lastSource: null, lastReport: null, lastError: null };
}

/** Run maintenance immediately (admin/cron) and record the outcome. */
export async function runMaintenanceNow(source: string, actorId: string | null = null): Promise<CronReport> {
  const repo = await getRepository();
  try {
    const report = await runScheduledMaintenance(repo, getMarketDataProvider(), actorId ?? source);
    g.__callscoreMaintenanceStatus = { lastRunAt: new Date().toISOString(), lastSource: source, lastReport: report, lastError: null };
    g.__callscoreMaintenanceAt = Date.now();
    return report;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    g.__callscoreMaintenanceStatus = { lastRunAt: new Date().toISOString(), lastSource: source, lastReport: null, lastError: message };
    throw err;
  }
}
const THROTTLE_MS = 5 * 60_000;

/**
 * Opportunistic maintenance for deployments without a frequent cron: on page
 * views, at most once every five minutes per server instance, schedule the
 * daily Battles, capture opens and settle anything past its end time.
 * Errors are swallowed so a provider hiccup never breaks page rendering.
 */
export async function maybeRunMaintenance(): Promise<void> {
  if (isDemoMode()) return;
  const now = Date.now();
  if (g.__callscoreMaintenanceRunning) return;
  if (g.__callscoreMaintenanceAt && now - g.__callscoreMaintenanceAt < THROTTLE_MS) return;
  g.__callscoreMaintenanceRunning = true;
  g.__callscoreMaintenanceAt = now;
  try {
    await runMaintenanceNow("page-view");
  } catch (err) {
    console.error("[maintenance]", err instanceof Error ? err.message : err);
  } finally {
    g.__callscoreMaintenanceRunning = false;
  }
}

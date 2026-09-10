import "server-only";
import { isDemoMode } from "../config";
import { getRepository } from "../data";
import { getMarketDataProvider } from "../market";
import { runScheduledMaintenance } from "./cron";

const g = globalThis as unknown as { __signalArenaMaintenanceAt?: number; __signalArenaMaintenanceRunning?: boolean };
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
  if (g.__signalArenaMaintenanceRunning) return;
  if (g.__signalArenaMaintenanceAt && now - g.__signalArenaMaintenanceAt < THROTTLE_MS) return;
  g.__signalArenaMaintenanceRunning = true;
  g.__signalArenaMaintenanceAt = now;
  try {
    const repo = await getRepository();
    await runScheduledMaintenance(repo, getMarketDataProvider(), "page-view");
  } catch (err) {
    console.error("[maintenance]", err instanceof Error ? err.message : err);
  } finally {
    g.__signalArenaMaintenanceRunning = false;
  }
}

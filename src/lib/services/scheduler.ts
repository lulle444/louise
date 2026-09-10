import type { ArenaRepository } from "../data/repository";
import type { MarketDataProvider } from "../market/provider";
import { DEFAULT_NEUTRAL_THRESHOLD_PERCENT } from "../config";
import type { Asset, Battle } from "../domain/types";
import { createBattle } from "./lifecycle";

const DAY = 86_400_000;
const ROTATION = ["BTC", "ETH", "SOL"] as const;

/** Hour (UTC) at which the Daily Battle stops accepting predictions. */
export function dailyLockHourUtc(): number {
  const v = Number(process.env.DAILY_LOCK_HOUR_UTC ?? 20);
  return Number.isInteger(v) && v >= 1 && v <= 23 ? v : 20;
}

/** Daily Battle window: opens 00:00 UTC, locks at DAILY_LOCK_HOUR_UTC (default 20:00), settles 00:00 UTC next day. */
export function dailyWindow(dayStartMs: number, lockHour = dailyLockHourUtc()) {
  return {
    opensAt: new Date(dayStartMs).toISOString(),
    locksAt: new Date(dayStartMs + lockHour * 3_600_000).toISOString(),
    endsAt: new Date(dayStartMs + DAY).toISOString(),
  };
}

export function utcDayStart(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** Deterministic asset rotation by UTC day number so every instance agrees. */
export function assetForDay(dayStartMs: number, assets: Asset[]): Asset | null {
  const dayNumber = Math.floor(dayStartMs / DAY);
  const symbol = ROTATION[dayNumber % ROTATION.length];
  return assets.find((a) => a.symbol === symbol && a.active) ?? assets.find((a) => a.active) ?? null;
}

export function isAutoScheduleEnabled(): boolean {
  return (process.env.AUTO_SCHEDULE_BATTLES ?? "true").trim().toLowerCase() !== "false";
}

/**
 * Make sure a published Daily Battle exists for today and tomorrow (UTC).
 * Idempotent: a day that already has any Battle opening at 00:00 UTC is skipped,
 * so admins can pre-create or customise a day without the scheduler interfering.
 */
export async function ensureDailyBattles(
  repo: ArenaRepository,
  provider: MarketDataProvider,
  now: Date = new Date(),
  opts: { daysAhead?: number; createdBy?: string | null } = {},
): Promise<Battle[]> {
  const daysAhead = opts.daysAhead ?? 1;
  const [assets, aiProfiles, existing] = await Promise.all([repo.listAssets(), repo.listAIProfiles(), repo.listBattles({ includeUnpublished: true })]);
  const existingOpens = new Set(existing.map((b) => Date.parse(b.opensAt)));
  const created: Battle[] = [];
  const today = utcDayStart(now);
  for (let d = 0; d <= daysAhead; d++) {
    const dayStart = today + d * DAY;
    if (existingOpens.has(dayStart)) continue;
    const window = dailyWindow(dayStart);
    // Skip today's Round if it would already be locked when created.
    if (now.getTime() >= Date.parse(window.locksAt)) continue;
    const asset = assetForDay(dayStart, assets);
    if (!asset) continue;
    const battle = await createBattle(repo, provider, {
      asset,
      ...window,
      neutralThresholdPercent: DEFAULT_NEUTRAL_THRESHOLD_PERCENT,
      aiProfileIds: aiProfiles.filter((p) => p.active).map((p) => p.id),
      createdBy: opts.createdBy ?? null,
      publish: true,
      now,
    });
    await repo.appendAudit({ actorId: null, action: "battle.auto_schedule", targetType: "round", targetId: battle.id, details: { asset: asset.symbol, opensAt: window.opensAt } });
    created.push(battle);
  }
  return created;
}

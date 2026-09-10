import { DEFAULT_NEUTRAL_THRESHOLD_PERCENT } from "../config";
import type { Asset, Battle } from "../domain/types";
import type { ArenaRepository, NewBattle } from "../data/repository";
import type { MarketDataProvider } from "../market/provider";
import { assertValidPrice } from "../market/provider";
import { generateAIPredictions } from "./ai";

export function battleSlug(symbol: string, opensAt: string): string {
  const d = new Date(opensAt);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${symbol.toLowerCase()}-daily-${y}${m}${day}-${hh}`;
}

export function defaultBattleTitle(asset: Asset, opensAt: string): string {
  const d = new Date(opensAt);
  return `${asset.symbol} Daily Round · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

export interface CreateBattleOptions {
  asset: Asset;
  opensAt: string;
  locksAt: string;
  endsAt: string;
  neutralThresholdPercent?: number;
  aiProfileIds: string[];
  createdBy: string | null;
  title?: string;
  publish: boolean;
  /** Clock to use for publishing (tests/schedulers). Defaults to now. */
  now?: Date;
}

/** Create a Battle (draft or published). Publishing captures the start price snapshot. */
export async function createBattle(
  repo: ArenaRepository,
  provider: MarketDataProvider,
  opts: CreateBattleOptions,
): Promise<Battle> {
  const input: NewBattle = {
    assetId: opts.asset.id,
    title: opts.title ?? defaultBattleTitle(opts.asset, opts.opensAt),
    slug: battleSlug(opts.asset.symbol, opts.opensAt),
    battleType: "daily",
    status: "draft",
    opensAt: opts.opensAt,
    locksAt: opts.locksAt,
    endsAt: opts.endsAt,
    neutralThresholdPercent: opts.neutralThresholdPercent ?? DEFAULT_NEUTRAL_THRESHOLD_PERCENT,
    startPrice: null,
    startPriceAt: null,
    endPrice: null,
    endPriceAt: null,
    outcome: null,
    settlementSource: null,
    settlementError: null,
    aiProfileIds: opts.aiProfileIds,
    createdBy: opts.createdBy,
  };
  const battle = await repo.createBattle(input);
  await repo.appendAudit({ actorId: opts.createdBy, action: "battle.create", targetType: "round", targetId: battle.id, details: { slug: battle.slug, assetId: battle.assetId } });
  if (opts.publish) return publishBattle(repo, provider, battle, opts.asset, opts.createdBy, opts.now ?? new Date());
  return battle;
}

/**
 * Publish a draft: capture the start-price snapshot at opensAt (or now if the
 * Battle opens in the future the snapshot is taken again when it opens) and
 * lock the AI forecasts if the Battle is already open.
 */
export async function publishBattle(
  repo: ArenaRepository,
  provider: MarketDataProvider,
  battle: Battle,
  asset: Asset,
  actorId: string | null,
  now: Date = new Date(),
): Promise<Battle> {
  if (battle.status !== "draft") return battle;
  const opensAt = new Date(battle.opensAt);
  let startPrice = battle.startPrice;
  let startPriceAt = battle.startPriceAt;
  if (startPrice === null && now.getTime() >= opensAt.getTime()) {
    const snap = await provider.getHistoricalPrice(asset.symbol, opensAt);
    startPrice = assertValidPrice(snap.price, `${asset.symbol} start`);
    startPriceAt = snap.timestamp;
    await repo.addPriceSnapshot({ assetId: asset.id, battleId: battle.id, price: startPrice, capturedAt: snap.timestamp, source: snap.source, kind: "start" });
  }
  const status = now.getTime() < opensAt.getTime() ? "upcoming" : now.getTime() < Date.parse(battle.locksAt) ? "open" : "locked";
  const updated = await repo.updateBattle(battle.id, { status, startPrice, startPriceAt, settlementError: null });
  await repo.appendAudit({ actorId, action: "battle.publish", targetType: "round", targetId: battle.id, details: { status, startPrice } });
  if (status === "open" && now.getTime() < Date.parse(battle.locksAt)) {
    await generateAIPredictions(repo, provider, updated, asset, { generatedAt: now });
  }
  return updated;
}

/**
 * Bring a published Battle up to date with the clock: capture the start price
 * when it opens and lock AI forecasts before locksAt. Safe to call repeatedly
 * (from cron or on page load in Demo Mode).
 */
export async function ensureBattleOpened(
  repo: ArenaRepository,
  provider: MarketDataProvider,
  battle: Battle,
  asset: Asset,
  now: Date = new Date(),
): Promise<Battle> {
  if (battle.status !== "upcoming" && battle.status !== "open") return battle;
  const t = now.getTime();
  if (t < Date.parse(battle.opensAt)) return battle;
  let updated = battle;
  if (updated.startPrice === null) {
    const opensAt = new Date(battle.opensAt);
    const snap = await provider.getHistoricalPrice(asset.symbol, opensAt);
    const price = assertValidPrice(snap.price, `${asset.symbol} start`);
    await repo.addPriceSnapshot({ assetId: asset.id, battleId: battle.id, price, capturedAt: snap.timestamp, source: snap.source, kind: "start" });
    updated = await repo.updateBattle(battle.id, { status: t < Date.parse(battle.locksAt) ? "open" : "locked", startPrice: price, startPriceAt: snap.timestamp });
  } else if (updated.status === "upcoming") {
    updated = await repo.updateBattle(battle.id, { status: t < Date.parse(battle.locksAt) ? "open" : "locked" });
  }
  if (t < Date.parse(battle.locksAt)) {
    const existing = await repo.listAIPredictions({ battleId: battle.id });
    const missing = updated.aiProfileIds.filter((id) => !existing.some((p) => p.aiProfileId === id));
    if (missing.length > 0) {
      // Generate as of the open time so all profiles see the same inputs.
      const generatedAt = new Date(Math.min(t, Date.parse(battle.opensAt) + 60_000));
      await generateAIPredictions(repo, provider, updated, asset, { generatedAt });
    }
  }
  return updated;
}

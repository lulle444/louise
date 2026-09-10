import { evaluateBadges, BADGE_CATALOGUE } from "../domain/badges";
import { computeStreaks, settlementXpAwards, XP_RULES } from "../domain/scoring";
import { canSettle, resolveOutcome, scorePrediction } from "../domain/settlement";
import type { Asset, Battle, Direction, Prediction, PredictionResult, XpReason } from "../domain/types";
import type { ArenaRepository, ResultUpdate } from "../data/repository";
import { assertValidPrice, MarketDataError, type MarketDataProvider } from "../market/provider";

export interface SettlementOutcome {
  status: "settled" | "already-settled" | "not-ready" | "failed" | "skipped";
  battle: Battle;
  message: string;
  change?: number;
  outcome?: Direction;
  humanResults?: number;
  aiResults?: number;
}

interface SettleOptions {
  source: string;
  actorId: string | null;
  now?: Date;
  /** Override the end price (admin use with audit). */
  endPriceOverride?: { price: number; at: string; reason: string };
}

/**
 * Settle a Battle. Idempotent and guarded:
 *  - a settled/void Battle is never re-settled;
 *  - the status transition to `settling` acts as a lock against concurrent runs;
 *  - XP is written through the ledger's unique (user, round, reason) key so a
 *    replay never double-awards.
 */
export async function settleBattle(
  repo: ArenaRepository,
  provider: MarketDataProvider,
  battleId: string,
  opts: SettleOptions,
): Promise<SettlementOutcome> {
  const now = opts.now ?? new Date();
  const battle = await repo.getBattle(battleId);
  if (!battle) throw new Error("Round not found");
  if (battle.status === "settled") return { status: "already-settled", battle, message: "Round is already settled." };
  if (battle.status === "void" || battle.status === "archived" || battle.status === "draft") {
    return { status: "skipped", battle, message: `Round is ${battle.status}; nothing to settle.` };
  }
  if (!canSettle(battle, now)) {
    return { status: "not-ready", battle, message: "Round has not reached its end time yet." };
  }

  const locked = await repo.transitionBattle(battle.id, ["upcoming", "open", "locked"], { status: "settling", settlementError: null });
  if (!locked) return { status: "skipped", battle, message: "Another settlement run is in progress." };

  const run = await repo.createSettlementRun({
    battleId: battle.id,
    status: "running",
    source: opts.source,
    triggeredBy: opts.actorId,
    startedAt: now.toISOString(),
    finishedAt: null,
    endPrice: null,
    error: null,
  });

  try {
    const assets = await repo.listAssets();
    const asset = assets.find((a) => a.id === battle.assetId);
    if (!asset) throw new Error("Asset not found for Round");

    // Start price: captured at open; fetch historically if it was never captured.
    let startPrice = battle.startPrice;
    let startPriceAt = battle.startPriceAt;
    if (startPrice === null) {
      const snap = await provider.getHistoricalPrice(asset.symbol, new Date(battle.opensAt));
      startPrice = assertValidPrice(snap.price, `${asset.symbol} start`);
      startPriceAt = snap.timestamp;
      await repo.addPriceSnapshot({ assetId: asset.id, battleId: battle.id, price: startPrice, capturedAt: snap.timestamp, source: snap.source, kind: "start" });
    }

    let endPrice: number;
    let endPriceAt: string;
    let source: string;
    if (opts.endPriceOverride) {
      endPrice = assertValidPrice(opts.endPriceOverride.price, `${asset.symbol} override`);
      endPriceAt = opts.endPriceOverride.at;
      source = `manual:${opts.actorId ?? "admin"}`;
      await repo.appendAudit({ actorId: opts.actorId, action: "battle.end_price_override", targetType: "round", targetId: battle.id, details: { price: endPrice, at: endPriceAt, reason: opts.endPriceOverride.reason } });
    } else {
      const snap = await provider.getHistoricalPrice(asset.symbol, new Date(battle.endsAt));
      endPrice = assertValidPrice(snap.price, `${asset.symbol} end`);
      endPriceAt = snap.timestamp;
      source = snap.source;
    }
    await repo.addPriceSnapshot({ assetId: asset.id, battleId: battle.id, price: endPrice, capturedAt: endPriceAt, source, kind: "end" });

    const { outcome, change } = resolveOutcome(startPrice, endPrice, battle.neutralThresholdPercent);

    const predictions = await repo.listPredictions({ battleId: battle.id });
    const aiPredictions = await repo.listAIPredictions({ battleId: battle.id });
    const allBattles = await repo.listBattles({ includeUnpublished: true });
    const battleById = new Map(allBattles.map((b) => [b.id, b]));
    const assetByBattle: Record<string, string> = {};
    for (const b of allBattles) assetByBattle[b.id] = assets.find((a) => a.id === b.assetId)?.symbol ?? "";
    const signals = await repo.listSignals();
    const signalSlugById: Record<string, string> = {};
    for (const s of signals) signalSlugById[s.id] = s.slug;

    // AI results (no XP for AI profiles).
    const aiUpdates: ResultUpdate[] = aiPredictions.map((p) => {
      const scored = scorePrediction(p.direction, outcome, false);
      return { id: p.id, ...scored };
    });
    await repo.updateAIPredictionResults(aiUpdates);

    const crowdCounts: Record<Direction, number> = { bullish: 0, neutral: 0, bearish: 0 };
    for (const p of predictions) crowdCounts[p.direction]++;
    const badgeBySlug = new Map(BADGE_CATALOGUE.map((b) => [b.slug, b]));

    const humanUpdates: ResultUpdate[] = [];
    for (const p of predictions) {
      const scored = scorePrediction(p.direction, outcome, false);
      const profile = await repo.getProfileById(p.userId);
      if (!profile) {
        humanUpdates.push({ id: p.id, ...scored, xpAwarded: 0 });
        continue;
      }

      // Chronological history excluding this prediction, ordered by Battle end time.
      const history = (await repo.listPredictions({ userId: p.userId }))
        .filter((h) => h.id !== p.id && (h.result === "correct" || h.result === "incorrect" || h.result === "void"))
        .sort((a, b) => Date.parse(battleById.get(a.battleId)?.endsAt ?? a.lockedAt) - Date.parse(battleById.get(b.battleId)?.endsAt ?? b.lockedAt));
      const ordered: PredictionResult[] = [...history.map((h) => h.result), scored.result];
      const streaks = computeStreaks(ordered);
      const validSettledAfter = ordered.filter((r) => r === "correct" || r === "incorrect").length;
      const ledger = await repo.listXpLedger(p.userId);
      const hasSevenBattleBonus = ledger.some((e) => e.reason === "seven_battles");
      const awards = settlementXpAwards({ result: scored.result, streakAfter: streaks.current, validSettledAfter, hasSevenBattleBonus });

      const inserted = await repo.addXpEntries(
        awards.map((a) => ({ userId: p.userId, battleId: battle.id, reason: a.reason as XpReason, amount: a.amount })),
      );
      const xpGained = inserted.reduce((s, e) => s + e.amount, 0);

      await repo.updateProfile(p.userId, {
        xp: profile.xp + xpGained,
        currentStreak: streaks.current,
        longestStreak: Math.max(profile.longestStreak, streaks.longest),
      });

      const settledPrediction: Prediction = { ...p, ...scored };
      const existingBadges = new Set((await repo.listUserBadges(p.userId)).map((b) => BADGE_CATALOGUE.find((x) => x.id === b.badgeId)?.slug ?? ""));
      const earned = evaluateBadges({
        prediction: settledPrediction,
        assetSymbol: asset.symbol,
        streakAfter: streaks.current,
        history: [...history, settledPrediction],
        assetByBattle,
        signalSlugById,
        aiResults: aiUpdates.map((a) => ({ result: a.result })),
        crowdCounts,
        crowdTotal: predictions.length,
        existing: existingBadges,
      });
      for (const slug of earned) {
        const badge = badgeBySlug.get(slug);
        if (badge) await repo.awardBadge({ userId: p.userId, badgeId: badge.id, awardedAt: now.toISOString(), sourceBattleId: battle.id });
      }

      humanUpdates.push({ id: p.id, ...scored, xpAwarded: (p.xpAwarded ?? XP_RULES.lock) + xpGained });
    }
    await repo.updatePredictionResults(humanUpdates);

    const settled = await repo.updateBattle(battle.id, {
      status: "settled",
      startPrice,
      startPriceAt,
      endPrice,
      endPriceAt,
      outcome,
      settlementSource: source,
      settlementError: null,
    });
    await repo.updateSettlementRun(run.id, { status: "succeeded", finishedAt: new Date().toISOString(), endPrice });
    await repo.appendAudit({ actorId: opts.actorId, action: "battle.settle", targetType: "round", targetId: battle.id, details: { outcome, change, endPrice, source: opts.source, humans: predictions.length, ai: aiPredictions.length } });
    return { status: "settled", battle: settled, message: `Settled ${outcome} (${change > 0 ? "+" : ""}${change.toFixed(2)}%).`, change, outcome, humanResults: predictions.length, aiResults: aiPredictions.length };
  } catch (err) {
    const message = err instanceof MarketDataError ? err.message : err instanceof Error ? err.message : "Unknown settlement error";
    const reverted = await repo.updateBattle(battle.id, { status: "locked", settlementError: message });
    await repo.updateSettlementRun(run.id, { status: "failed", finishedAt: new Date().toISOString(), error: message });
    await repo.appendAudit({ actorId: opts.actorId, action: "battle.settle_failed", targetType: "round", targetId: battle.id, details: { error: message, source: opts.source } });
    return { status: "failed", battle: reverted, message };
  }
}

/** Void a Battle: predictions are marked void and excluded from accuracy; no XP changes. */
export async function voidBattle(
  repo: ArenaRepository,
  battleId: string,
  opts: { actorId: string | null; reason: string },
): Promise<Battle> {
  const battle = await repo.getBattle(battleId);
  if (!battle) throw new Error("Round not found");
  if (battle.status === "void") return battle;
  if (battle.status === "settled") throw new Error("A settled Round cannot be voided. Archive it instead.");
  const predictions = await repo.listPredictions({ battleId });
  await repo.updatePredictionResults(predictions.map((p) => ({ id: p.id, result: "void" as const, battleScore: null })));
  const ai = await repo.listAIPredictions({ battleId });
  await repo.updateAIPredictionResults(ai.map((p) => ({ id: p.id, result: "void" as const, battleScore: null })));
  const updated = await repo.updateBattle(battleId, { status: "void", outcome: null, settlementError: opts.reason });
  await repo.appendAudit({ actorId: opts.actorId, action: "battle.void", targetType: "round", targetId: battleId, details: { reason: opts.reason, predictions: predictions.length } });
  return updated;
}

export async function findAssetForBattle(repo: ArenaRepository, battle: Battle): Promise<Asset> {
  const assets = await repo.listAssets();
  const asset = assets.find((a) => a.id === battle.assetId);
  if (!asset) throw new Error("Asset not found");
  return asset;
}

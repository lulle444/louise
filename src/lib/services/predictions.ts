import { BADGE_CATALOGUE } from "../domain/badges";
import { getSeason } from "../config";
import { XP_RULES } from "../domain/scoring";
import { isAcceptingPredictions } from "../domain/settlement";
import { predictionInputSchema, validatePredictionDeadline, type PredictionInput } from "../domain/validation";
import type { Prediction, Viewer } from "../domain/types";
import { DuplicatePredictionError, type ArenaRepository } from "../data/repository";
import type { MarketDataProvider } from "../market/provider";

export class PredictionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "PredictionError";
  }
}

/**
 * Lock a prediction. Enforces every rule server-side: Battle open window,
 * exactly three unique active signals, confidence 1–5, thesis length, one
 * prediction per user per Battle. Awards lock XP through the ledger.
 */
export async function lockPrediction(
  repo: ArenaRepository,
  provider: MarketDataProvider,
  viewer: Viewer,
  raw: unknown,
  now: Date = new Date(),
): Promise<Prediction> {
  const parsed = predictionInputSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new PredictionError(issue?.message ?? "Invalid prediction", "invalid");
  }
  const input: PredictionInput = parsed.data;

  const battle = await repo.getBattle(input.battleId);
  if (!battle) throw new PredictionError("Battle not found.", "not_found");
  if (!isAcceptingPredictions(battle, now)) {
    const deadline = validatePredictionDeadline({ opensAt: battle.opensAt, locksAt: battle.locksAt, now });
    throw new PredictionError(deadline.ok ? "This Battle is not accepting predictions." : deadline.reason, "closed");
  }

  const signals = await repo.listSignals();
  for (const id of input.signalIds) {
    const s = signals.find((x) => x.id === id);
    if (!s || !s.active) throw new PredictionError("One of the selected signals is not available.", "invalid_signal");
  }

  const existing = await repo.listPredictions({ battleId: battle.id, userId: viewer.id });
  if (existing.length > 0) throw new DuplicatePredictionError();

  const assets = await repo.listAssets();
  const asset = assets.find((a) => a.id === battle.assetId);
  let referencePrice: number | null = null;
  try {
    if (asset) referencePrice = (await provider.getCurrentPrice(asset.symbol)).price;
  } catch {
    referencePrice = battle.startPrice;
  }

  const prediction = await repo.createPrediction({
    battleId: battle.id,
    userId: viewer.id,
    direction: input.direction,
    signalIds: input.signalIds,
    confidence: input.confidence,
    thesis: input.thesis,
    referencePrice,
    lockedAt: now.toISOString(),
  });

  const inserted = await repo.addXpEntries([{ userId: viewer.id, battleId: battle.id, reason: "lock", amount: XP_RULES.lock }]);
  if (inserted.length > 0) {
    const profile = await repo.getProfileById(viewer.id);
    if (profile) await repo.updateProfile(viewer.id, { xp: profile.xp + XP_RULES.lock });
  }
  await repo.updatePredictionResults([{ id: prediction.id, result: "pending", battleScore: null, xpAwarded: XP_RULES.lock }]);
  const firstSignal = BADGE_CATALOGUE.find((b) => b.slug === "first-signal");
  if (firstSignal) await repo.awardBadge({ userId: viewer.id, badgeId: firstSignal.id, awardedAt: now.toISOString(), sourceBattleId: battle.id });
  const season = getSeason(now);
  if (now.getTime() >= Date.parse(season.startsAt) && now.getTime() < Date.parse(season.foundingWindowEndsAt)) {
    const founding = BADGE_CATALOGUE.find((b) => b.slug === "founding-analyst");
    if (founding) await repo.awardBadge({ userId: viewer.id, badgeId: founding.id, awardedAt: now.toISOString(), sourceBattleId: battle.id });
  }
  return { ...prediction, xpAwarded: XP_RULES.lock };
}

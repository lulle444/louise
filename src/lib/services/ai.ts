import { inputsFromSeries, runStrategy } from "../domain/ai-strategies";
import type { AIPrediction, AIProfile, Asset, Battle, Signal } from "../domain/types";
import type { MarketDataProvider } from "../market/provider";
import type { ArenaRepository } from "../data/repository";

const DAY = 86_400_000;

/**
 * Generate and lock AI forecasts for a Battle. Idempotent: an existing
 * forecast for (battle, profile) is never overwritten. Inputs are derived only
 * from prices available at generation time, which must be before locksAt.
 */
export async function generateAIPredictions(
  repo: ArenaRepository,
  provider: MarketDataProvider,
  battle: Battle,
  asset: Asset,
  opts: { generatedAt?: Date; profiles?: AIProfile[]; signals?: Signal[] } = {},
): Promise<AIPrediction[]> {
  const generatedAt = opts.generatedAt ?? new Date();
  if (generatedAt.getTime() >= Date.parse(battle.locksAt)) {
    throw new Error("AI forecasts must be generated before the Battle locks");
  }
  const profiles = (opts.profiles ?? (await repo.listAIProfiles())).filter((p) => p.active && battle.aiProfileIds.includes(p.id));
  const signals = opts.signals ?? (await repo.listSignals());
  const from = new Date(generatedAt.getTime() - 9 * DAY);
  const series = await provider.getPriceSeries(asset.symbol, from, generatedAt, 10);
  const prices = series.map((p) => p.price);
  const inputs = inputsFromSeries({ symbol: asset.symbol, battleId: battle.id, prices, neutralThresholdPercent: battle.neutralThresholdPercent });
  const referencePrice = prices[prices.length - 1];
  const out: AIPrediction[] = [];
  for (const profile of profiles) {
    const forecast = runStrategy(profile, inputs, signals);
    const created = await repo.insertAIPredictionIfAbsent({
      battleId: battle.id,
      aiProfileId: profile.id,
      direction: forecast.direction,
      signalIds: forecast.signalIds,
      confidence: forecast.confidence,
      thesis: forecast.thesis,
      referencePrice,
      generatedAt: generatedAt.toISOString(),
      lockedAt: generatedAt.toISOString(),
      strategyVersion: profile.strategyVersion,
      inputSnapshot: { ...forecast.inputSnapshot, source: provider.name, simulated: provider.isMock },
      result: "pending",
      battleScore: null,
    });
    out.push(created);
  }
  return out;
}

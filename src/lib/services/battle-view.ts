import { aggregateCrowd, canRevealCrowd, type CrowdSignal } from "../domain/crowd";
import { effectiveStatus, isAcceptingPredictions, percentageChange } from "../domain/settlement";
import type { AIPrediction, AIProfile, Asset, Battle, BattleStatus, Prediction, Profile, Signal, Viewer } from "../domain/types";
import type { ArenaRepository } from "../data/repository";
import type { MarketDataProvider, MarketPrice, PricePoint } from "../market/provider";

export interface BattleSummary {
  battle: Battle;
  asset: Asset;
  status: BattleStatus;
  participantCount: number;
  aiCount: number;
  viewerState: "not-entered" | "locked" | "settled" | "void";
  change: number | null;
}

export interface BattleView extends BattleSummary {
  signals: Signal[];
  aiProfiles: AIProfile[];
  viewerPrediction: Prediction | null;
  viewerProfile: Profile | null;
  crowd: CrowdSignal | null;
  crowdRevealed: boolean;
  aiPredictions: AIPrediction[];
  aiRevealed: boolean;
  livePrice: MarketPrice | null;
  priceUnavailable: boolean;
  series: PricePoint[];
  isMockData: boolean;
  acceptingPredictions: boolean;
  humanPredictions: Prediction[];
  participants: Profile[];
}

export function summarizeBattle(battle: Battle, asset: Asset, predictions: Prediction[], aiCount: number, viewerId: string | null, now = new Date()): BattleSummary {
  const status = effectiveStatus(battle, now);
  const mine = viewerId ? predictions.find((p) => p.userId === viewerId) ?? null : null;
  let viewerState: BattleSummary["viewerState"] = "not-entered";
  if (mine) viewerState = mine.result === "void" ? "void" : mine.result === "pending" ? "locked" : "settled";
  const change = battle.startPrice && battle.endPrice ? percentageChange(battle.startPrice, battle.endPrice) : null;
  return { battle, asset, status, participantCount: predictions.length, aiCount, viewerState, change };
}

export async function listBattleSummaries(repo: ArenaRepository, viewer: Viewer | null, now = new Date()): Promise<BattleSummary[]> {
  const [battles, assets, predictions, aiPredictions] = await Promise.all([repo.listBattles(), repo.listAssets(), repo.listPredictions(), repo.listAIPredictions()]);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  return battles
    .map((b) => {
      const asset = assetById.get(b.assetId);
      if (!asset) return null;
      return summarizeBattle(b, asset, predictions.filter((p) => p.battleId === b.id), aiPredictions.filter((p) => p.battleId === b.id).length, viewer?.id ?? null, now);
    })
    .filter((s): s is BattleSummary => s !== null);
}

export async function buildBattleView(repo: ArenaRepository, provider: MarketDataProvider, battleIdOrSlug: string, viewer: Viewer | null, now = new Date()): Promise<BattleView | null> {
  const battle = await repo.getBattle(battleIdOrSlug);
  if (!battle || battle.status === "draft") return null;
  const [assets, signals, aiProfiles, predictions, aiPredictions, profiles] = await Promise.all([
    repo.listAssets(),
    repo.listSignals(),
    repo.listAIProfiles(),
    repo.listPredictions({ battleId: battle.id }),
    repo.listAIPredictions({ battleId: battle.id }),
    repo.listProfiles(),
  ]);
  const asset = assets.find((a) => a.id === battle.assetId);
  if (!asset) return null;
  const summary = summarizeBattle(battle, asset, predictions, aiPredictions.length, viewer?.id ?? null, now);
  const viewerPrediction = viewer ? predictions.find((p) => p.userId === viewer.id) ?? null : null;
  const accepting = isAcceptingPredictions(battle, now);
  const revealed = canRevealCrowd({ viewerHasLocked: Boolean(viewerPrediction), battleAcceptingPredictions: accepting });

  let livePrice: MarketPrice | null = null;
  let priceUnavailable = false;
  let series: PricePoint[] = [];
  try {
    const status = summary.status;
    const to = status === "settled" || status === "void" ? new Date(battle.endsAt) : now;
    const from = new Date(Date.parse(battle.opensAt) - 2 * 86_400_000);
    const [price, pts] = await Promise.all([
      status === "settled" || status === "void" ? Promise.resolve<MarketPrice | null>(null) : provider.getCurrentPrice(asset.symbol),
      provider.getPriceSeries(asset.symbol, from, to, 48),
    ]);
    livePrice = price;
    series = pts;
  } catch {
    priceUnavailable = true;
  }

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  return {
    ...summary,
    signals: signals.filter((s) => s.active),
    aiProfiles: aiProfiles.filter((p) => battle.aiProfileIds.includes(p.id)),
    viewerPrediction,
    viewerProfile: viewer ? profileById.get(viewer.id) ?? null : null,
    crowd: revealed ? aggregateCrowd(predictions) : null,
    crowdRevealed: revealed,
    aiPredictions: revealed ? aiPredictions : [],
    aiRevealed: revealed,
    livePrice,
    priceUnavailable,
    series,
    isMockData: provider.isMock,
    acceptingPredictions: accepting,
    humanPredictions: revealed ? predictions : [],
    participants: revealed ? predictions.map((p) => profileById.get(p.userId)).filter((p): p is Profile => Boolean(p)) : [],
  };
}

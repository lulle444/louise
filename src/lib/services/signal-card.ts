import type { ArenaRepository } from "../data/repository";
import type { SignalCardData } from "@/components/arena/SignalCard";
import { toSignalCardData } from "@/components/arena/SignalCard";
import { streakAfterBattle } from "./stats";

/** Resolve a public Call Card (human or AI) by prediction id. */
export async function loadSignalCard(repo: ArenaRepository, predictionId: string): Promise<SignalCardData | null> {
  const [assets, signals] = await Promise.all([repo.listAssets(), repo.listSignals()]);
  const human = await repo.getPrediction(predictionId);
  if (human) {
    const [battle, profile] = await Promise.all([repo.getBattle(human.battleId), repo.getProfileById(human.userId)]);
    if (!battle || battle.status === "draft") return null;
    const asset = assets.find((a) => a.id === battle.assetId);
    if (!asset) return null;
    let streakAfter: number | null = null;
    let beatAI: string[] = [];
    if (human.result === "correct") {
      const [history, battles, ai, profiles] = await Promise.all([repo.listPredictions({ userId: human.userId }), repo.listBattles(), repo.listAIPredictions({ battleId: battle.id }), repo.listAIProfiles()]);
      streakAfter = streakAfterBattle(history, battles, battle.id);
      beatAI = ai.filter((p) => p.result === "incorrect").map((p) => profiles.find((x) => x.id === p.aiProfileId)?.name ?? "AI");
    }
    return toSignalCardData({ id: human.id, kind: "human", profile, asset, battle, direction: human.direction, signalIds: human.signalIds, allSignals: signals, confidence: human.confidence, thesis: human.thesis, lockedAt: human.lockedAt, referencePrice: human.referencePrice, result: human.result, battleScore: human.battleScore, xpAwarded: human.xpAwarded, streakAfter, beatAI });
  }
  const ai = await repo.getAIPrediction(predictionId);
  if (ai) {
    const [battle, profiles] = await Promise.all([repo.getBattle(ai.battleId), repo.listAIProfiles()]);
    if (!battle || battle.status === "draft") return null;
    const asset = assets.find((a) => a.id === battle.assetId);
    const aiProfile = profiles.find((p) => p.id === ai.aiProfileId);
    if (!asset || !aiProfile) return null;
    return toSignalCardData({ id: ai.id, kind: "ai", aiProfile, asset, battle, direction: ai.direction, signalIds: ai.signalIds, allSignals: signals, confidence: ai.confidence, thesis: ai.thesis, lockedAt: ai.lockedAt, referencePrice: ai.referencePrice, result: ai.result, battleScore: ai.battleScore });
  }
  return null;
}

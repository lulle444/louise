"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode } from "../config";
import { getRepository, DuplicatePredictionError } from "../data";
import { getMarketDataProvider } from "../market";
import { getViewer } from "../auth/session";
import { lockPrediction, PredictionError } from "../services/predictions";
import { syncDemoOverlay } from "./demo-sync";

export interface LockState {
  ok: boolean;
  error?: string;
  predictionId?: string;
}

export async function lockPredictionAction(input: {
  battleId: string;
  direction: string;
  signalIds: string[];
  confidence: number;
  thesis?: string;
}): Promise<LockState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to lock a prediction." };
  try {
    const repo = await getRepository();
    const provider = getMarketDataProvider();
    const prediction = await lockPrediction(repo, provider, viewer, input);
    if (isDemoMode()) await syncDemoOverlay(viewer.id);
    revalidatePath(`/rounds/${input.battleId}`);
    revalidatePath("/rounds");
    revalidatePath("/");
    return { ok: true, predictionId: prediction.id };
  } catch (err) {
    if (err instanceof DuplicatePredictionError || err instanceof PredictionError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "Could not lock the call." };
  }
}

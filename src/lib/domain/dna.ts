import { MIN_ASSET_BATTLES, MIN_DNA_BATTLES, MIN_SIGNAL_USES } from "../config";
import { computeAccuracy } from "./scoring";
import type { Asset, Battle, Direction, Prediction, Signal } from "./types";

export type MarketStyle =
  | "Trend Hunter"
  | "Momentum Reader"
  | "Sentiment Scout"
  | "Volatility Navigator"
  | "Contrarian"
  | "Balanced Analyst";

export interface SignalUsage {
  signalId: string;
  slug: string;
  name: string;
  uses: number;
  correct: number;
  valid: number;
  accuracy: number | null;
}

export interface AssetPerformance {
  assetId: string;
  symbol: string;
  battles: number;
  correct: number;
  valid: number;
  accuracy: number | null;
}

export interface DirectionAccuracy {
  direction: Direction;
  count: number;
  correct: number;
  valid: number;
  accuracy: number | null;
}

export interface ConfidenceCalibration {
  confidence: number;
  count: number;
  correct: number;
  valid: number;
  accuracy: number | null;
}

export interface SignalDNA {
  ready: boolean;
  validSettled: number;
  requiredSettled: number;
  mostUsedSignal: SignalUsage | null;
  bestSignal: SignalUsage | null;
  bestAsset: AssetPerformance | null;
  bestTimeframe: string;
  signalUsage: SignalUsage[];
  assetPerformance: AssetPerformance[];
  directionAccuracy: DirectionAccuracy[];
  calibration: ConfidenceCalibration[];
  /** Radar axes: 0..100 per signal (share of uses weighted by accuracy). */
  radar: Array<{ axis: string; slug: string; value: number }>;
  style: MarketStyle | null;
  styleReason: string | null;
  contrarianRate: number | null;
}

interface DnaInput {
  predictions: Prediction[];
  battles: Battle[];
  assets: Asset[];
  signals: Signal[];
  /** Crowd majority per battle id, used to detect contrarian behaviour. */
  crowdMajority?: Record<string, Direction | null>;
}

export function computeSignalDNA(input: DnaInput): SignalDNA {
  const battleById = new Map(input.battles.map((b) => [b.id, b]));
  const assetById = new Map(input.assets.map((a) => [a.id, a]));
  const signalById = new Map(input.signals.map((s) => [s.id, s]));

  const settled = input.predictions.filter((p) => p.result === "correct" || p.result === "incorrect");
  const validSettled = settled.length;

  // Signal usage across all locked predictions (settled ones count for accuracy).
  const usage = new Map<string, SignalUsage>();
  for (const p of input.predictions) {
    for (const sid of p.signalIds) {
      const sig = signalById.get(sid);
      if (!sig) continue;
      const u = usage.get(sid) ?? { signalId: sid, slug: sig.slug, name: sig.name, uses: 0, correct: 0, valid: 0, accuracy: null };
      u.uses++;
      if (p.result === "correct") { u.correct++; u.valid++; }
      else if (p.result === "incorrect") u.valid++;
      usage.set(sid, u);
    }
  }
  const signalUsage = [...usage.values()].map((u) => ({ ...u, accuracy: u.valid ? u.correct / u.valid : null }))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));

  const assetMap = new Map<string, AssetPerformance>();
  for (const p of settled) {
    const b = battleById.get(p.battleId);
    if (!b) continue;
    const a = assetById.get(b.assetId);
    if (!a) continue;
    const ap = assetMap.get(a.id) ?? { assetId: a.id, symbol: a.symbol, battles: 0, correct: 0, valid: 0, accuracy: null };
    ap.battles++;
    ap.valid++;
    if (p.result === "correct") ap.correct++;
    assetMap.set(a.id, ap);
  }
  const assetPerformance = [...assetMap.values()].map((a) => ({ ...a, accuracy: a.valid ? a.correct / a.valid : null }))
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0) || b.battles - a.battles);

  const directionAccuracy: DirectionAccuracy[] = (["bullish", "neutral", "bearish"] as Direction[]).map((d) => {
    const ofDir = input.predictions.filter((p) => p.direction === d);
    const acc = computeAccuracy(ofDir);
    return { direction: d, count: ofDir.length, correct: acc.correct, valid: acc.valid, accuracy: acc.accuracy };
  });

  const calibration: ConfidenceCalibration[] = [1, 2, 3, 4, 5].map((c) => {
    const ofC = input.predictions.filter((p) => p.confidence === c);
    const acc = computeAccuracy(ofC);
    return { confidence: c, count: ofC.length, correct: acc.correct, valid: acc.valid, accuracy: acc.accuracy };
  });

  const ready = validSettled >= MIN_DNA_BATTLES;

  const mostUsedSignal = signalUsage[0] ?? null;
  const bestSignal = ready
    ? [...signalUsage]
        .filter((u) => u.valid >= MIN_SIGNAL_USES && u.accuracy !== null)
        .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0) || b.valid - a.valid)[0] ?? null
    : null;
  const bestAsset = ready
    ? assetPerformance.filter((a) => a.battles >= MIN_ASSET_BATTLES)[0] ?? null
    : null;

  // Contrarian rate: share of settled predictions that disagreed with the crowd majority.
  let contrarianRate: number | null = null;
  if (input.crowdMajority && settled.length > 0) {
    let against = 0;
    let counted = 0;
    for (const p of settled) {
      const maj = input.crowdMajority[p.battleId];
      if (!maj) continue;
      counted++;
      if (maj !== p.direction) against++;
    }
    contrarianRate = counted ? against / counted : null;
  }

  const totalUses = signalUsage.reduce((s, u) => s + u.uses, 0) || 1;
  const radar = input.signals
    .filter((s) => s.active)
    .map((s) => {
      const u = usage.get(s.id);
      const share = u ? u.uses / totalUses : 0;
      const acc = u?.accuracy ?? 0;
      // Blend of how often the signal is used and how well it has performed.
      const value = Math.round(Math.min(100, share * 100 * 1.5 + acc * 50));
      return { axis: s.name, slug: s.slug, value };
    });

  let style: MarketStyle | null = null;
  let styleReason: string | null = null;
  if (ready) {
    const shares = new Map(signalUsage.map((u) => [u.slug, u.uses / totalUses]));
    const trend = shares.get("market-trend") ?? 0;
    const momentum = shares.get("momentum") ?? 0;
    const sentiment = (shares.get("social-sentiment") ?? 0) + (shares.get("fear-greed") ?? 0);
    const vol = shares.get("volatility") ?? 0;
    if (contrarianRate !== null && contrarianRate >= 0.5) {
      style = "Contrarian";
      styleReason = `Disagreed with the crowd majority in ${Math.round(contrarianRate * 100)}% of settled Rounds.`;
    } else {
      const ranked = [
        { style: "Trend Hunter" as MarketStyle, v: trend, label: "Market Trend" },
        { style: "Momentum Reader" as MarketStyle, v: momentum, label: "Momentum" },
        { style: "Sentiment Scout" as MarketStyle, v: sentiment, label: "Social Sentiment and Fear & Greed" },
        { style: "Volatility Navigator" as MarketStyle, v: vol, label: "Volatility" },
      ].sort((a, b) => b.v - a.v);
      const top = ranked[0];
      if (top.v >= 0.24) {
        style = top.style;
        styleReason = `${top.label} appears in ${Math.round(top.v * 100)}% of cited signals.`;
      } else {
        style = "Balanced Analyst";
        styleReason = "Signal usage is spread evenly across categories.";
      }
    }
  }

  return {
    ready,
    validSettled,
    requiredSettled: MIN_DNA_BATTLES,
    mostUsedSignal,
    bestSignal,
    bestAsset,
    bestTimeframe: "24H Daily Round",
    signalUsage,
    assetPerformance,
    directionAccuracy,
    calibration,
    radar,
    style,
    styleReason,
    contrarianRate,
  };
}

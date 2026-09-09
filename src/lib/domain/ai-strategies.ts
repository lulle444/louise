import { seededRandom } from "./random";
import type { AIProfile, Direction, Signal } from "./types";

/**
 * Deterministic, rule-based AI analyst strategies.
 *
 * These are simulations, not commercial AI models. Each strategy consumes a
 * safe, non-secret input snapshot derived from historical prices available
 * *before* the Battle locks, and returns the same forecast structure a human
 * submits. Strategies never see the end price.
 */

export interface StrategyInputs {
  symbol: string;
  battleId: string;
  /** Percentage returns over the trailing windows, as of generation time. */
  return1d: number;
  return3d: number;
  return7d: number;
  /** Standard deviation of trailing 7 daily returns, in percent. */
  volatility7d: number;
  /** Distance of the current price from the 7-day mean, in percent. */
  distanceFromMean7d: number;
  neutralThresholdPercent: number;
}

export interface StrategyOutput {
  direction: Direction;
  signalSlugs: string[];
  confidence: number;
  thesis: string;
  inputSnapshot: Record<string, number | string>;
}

function clampConfidence(v: number): number {
  return Math.max(1, Math.min(5, Math.round(v)));
}

function fmt(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function snapshot(i: StrategyInputs): Record<string, number | string> {
  return {
    symbol: i.symbol,
    return1d: Number(i.return1d.toFixed(4)),
    return3d: Number(i.return3d.toFixed(4)),
    return7d: Number(i.return7d.toFixed(4)),
    volatility7d: Number(i.volatility7d.toFixed(4)),
    distanceFromMean7d: Number(i.distanceFromMean7d.toFixed(4)),
    neutralThresholdPercent: i.neutralThresholdPercent,
  };
}

function oracle(i: StrategyInputs): StrategyOutput {
  const score = 0.5 * Math.tanh(i.return7d / 4) + 0.3 * Math.tanh(i.return3d / 2.5) + 0.2 * Math.tanh(i.return1d / 1.5);
  const band = 0.12 + Math.min(0.2, i.volatility7d / 40);
  let direction: Direction = "neutral";
  if (score > band) direction = "bullish";
  else if (score < -band) direction = "bearish";
  const confidence = clampConfidence(2 + Math.abs(score) * 4);
  const thesis =
    direction === "neutral"
      ? `Trend (${fmt(i.return7d)} over 7d) and momentum (${fmt(i.return3d)} over 3d) disagree or are muted; expecting a range inside the ${i.neutralThresholdPercent}% band.`
      : `7-day trend ${fmt(i.return7d)}, 3-day momentum ${fmt(i.return3d)} and 1-day ${fmt(i.return1d)} align ${direction}; volume behaviour supports continuation.`;
  return { direction, signalSlugs: ["market-trend", "momentum", "volume"], confidence, thesis, inputSnapshot: snapshot(i) };
}

function vector(i: StrategyInputs): StrategyOutput {
  const m = 0.6 * i.return1d + 0.4 * (i.return3d / 3);
  const minMove = Math.max(0.15, i.neutralThresholdPercent * 0.3);
  let direction: Direction = "neutral";
  if (m > minMove) direction = "bullish";
  else if (m < -minMove) direction = "bearish";
  const confidence = clampConfidence(3 + Math.min(2, Math.abs(m) / 1.2));
  const thesis =
    direction === "neutral"
      ? `Momentum flat (1d ${fmt(i.return1d)}, 3d ${fmt(i.return3d)}); no directional edge until volatility (${i.volatility7d.toFixed(2)}%) expands.`
      : `Momentum ${direction === "bullish" ? "positive" : "negative"}: 1d ${fmt(i.return1d)}, 3d ${fmt(i.return3d)}. Riding the directional move with volatility at ${i.volatility7d.toFixed(2)}%.`;
  return { direction, signalSlugs: ["momentum", "market-trend", "volatility"], confidence, thesis, inputSnapshot: snapshot(i) };
}

function echo(i: StrategyInputs): StrategyOutput {
  // Sentiment proxy: recent 3-day move. Over-extended moves invite mean reversion.
  const sentiment = i.return3d;
  const stretched = Math.abs(i.distanceFromMean7d) > Math.max(2.5, i.volatility7d * 1.6);
  let direction: Direction;
  let thesis: string;
  if (stretched) {
    direction = i.distanceFromMean7d > 0 ? "bearish" : "bullish";
    thesis = `Narrative looks crowded: price is ${fmt(i.distanceFromMean7d)} from its 7-day mean. Expecting the crowd to fade and a ${direction} mean reversion.`;
  } else if (Math.abs(sentiment) < Math.max(0.6, i.neutralThresholdPercent)) {
    direction = "neutral";
    thesis = `Sentiment is undecided (3d ${fmt(sentiment)}) and breadth is mixed; expecting a quiet session inside the neutral band.`;
  } else {
    direction = sentiment > 0 ? "bullish" : "bearish";
    thesis = `Social mood is ${direction === "bullish" ? "constructive" : "sour"} (3d ${fmt(sentiment)}) and breadth confirms; following the narrative.`;
  }
  const confidence = clampConfidence(2 + Math.min(3, Math.abs(sentiment) / 1.5));
  return { direction, signalSlugs: ["social-sentiment", "volume", "market-breadth"], confidence, thesis, inputSnapshot: snapshot(i) };
}

const STRATEGIES: Record<string, (i: StrategyInputs) => StrategyOutput> = {
  oracle,
  vector,
  echo,
};

export function runStrategy(profile: AIProfile, inputs: StrategyInputs, signals: Signal[]): StrategyOutput & { signalIds: string[] } {
  const fn = STRATEGIES[profile.slug];
  if (!fn) throw new Error(`Unknown AI strategy: ${profile.slug}`);
  const out = fn(inputs);
  const signalIds = out.signalSlugs.map((slug) => {
    const s = signals.find((x) => x.slug === slug);
    if (!s) throw new Error(`Unknown signal slug ${slug}`);
    return s.id;
  });
  // Tie-break deterministic jitter so profiles are not perfectly correlated on flat markets.
  const rng = seededRandom(`${profile.slug}:${inputs.battleId}`);
  const confidence = clampConfidence(out.confidence + (rng() < 0.15 ? 1 : 0) - (rng() < 0.15 ? 1 : 0));
  return { ...out, confidence, signalIds };
}

/** Build strategy inputs from an ordered daily price series ending at generation time. */
export function inputsFromSeries(input: {
  symbol: string;
  battleId: string;
  /** Daily closes, oldest first, at least 8 points. Last point = current price. */
  prices: number[];
  neutralThresholdPercent: number;
}): StrategyInputs {
  const p = input.prices;
  if (p.length < 8) throw new Error("Need at least 8 daily prices for strategy inputs");
  const last = p[p.length - 1];
  const ret = (n: number) => ((last - p[p.length - 1 - n]) / p[p.length - 1 - n]) * 100;
  const daily: number[] = [];
  for (let k = p.length - 7; k < p.length; k++) daily.push(((p[k] - p[k - 1]) / p[k - 1]) * 100);
  const mean = daily.reduce((s, v) => s + v, 0) / daily.length;
  const variance = daily.reduce((s, v) => s + (v - mean) ** 2, 0) / daily.length;
  const window = p.slice(-7);
  const mean7 = window.reduce((s, v) => s + v, 0) / window.length;
  return {
    symbol: input.symbol,
    battleId: input.battleId,
    return1d: ret(1),
    return3d: ret(3),
    return7d: ret(7),
    volatility7d: Math.sqrt(variance),
    distanceFromMean7d: ((last - mean7) / mean7) * 100,
    neutralThresholdPercent: input.neutralThresholdPercent,
  };
}

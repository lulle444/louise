/**
 * Shared domain types for CALLSCORE.
 * All timestamps are ISO-8601 strings in UTC.
 */

export type Direction = "bullish" | "neutral" | "bearish";
export const DIRECTIONS: Direction[] = ["bullish", "neutral", "bearish"];

export type BattleStatus =
  | "draft"
  | "upcoming"
  | "open"
  | "locked"
  | "settling"
  | "settled"
  | "void"
  | "archived";

export const BATTLE_STATUSES: BattleStatus[] = [
  "draft",
  "upcoming",
  "open",
  "locked",
  "settling",
  "settled",
  "void",
  "archived",
];

export type BattleType = "daily";

export type PredictionResult = "pending" | "correct" | "incorrect" | "void";

export type AssetSymbol = "BTC" | "ETH" | "SOL";

export interface Asset {
  id: string;
  symbol: AssetSymbol;
  name: string;
  /** External market-data provider identifier (e.g. CoinGecko id). */
  providerId: string;
  logoUrl: string | null;
  priceDecimals: number;
  active: boolean;
}

export interface Signal {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Lucide icon name. */
  icon: string;
  accentColor: string;
  active: boolean;
}

export interface Battle {
  id: string;
  assetId: string;
  title: string;
  slug: string;
  battleType: BattleType;
  status: BattleStatus;
  opensAt: string;
  locksAt: string;
  endsAt: string;
  neutralThresholdPercent: number;
  startPrice: number | null;
  startPriceAt: string | null;
  endPrice: number | null;
  endPriceAt: string | null;
  outcome: Direction | null;
  settlementSource: string | null;
  settlementError: string | null;
  /** AI profile ids enabled for this Battle. */
  aiProfileIds: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionCore {
  direction: Direction;
  signalIds: string[];
  confidence: number;
  thesis: string | null;
  referencePrice: number | null;
  lockedAt: string;
  result: PredictionResult;
  battleScore: number | null;
}

export interface Prediction extends PredictionCore {
  id: string;
  battleId: string;
  userId: string;
  xpAwarded: number | null;
  createdAt: string;
}

export interface AIPrediction extends PredictionCore {
  id: string;
  battleId: string;
  aiProfileId: string;
  generatedAt: string;
  strategyVersion: string;
  inputSnapshot: Record<string, number | string | boolean | null>;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIProfile {
  id: string;
  slug: string;
  name: string;
  description: string;
  tagline: string;
  strategyType: string;
  strategyVersion: string;
  accentColor: string;
  /** Signal slugs the profile prefers to cite. */
  prefers: string[];
  active: boolean;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadge {
  userId: string;
  badgeId: string;
  awardedAt: string;
  sourceBattleId: string | null;
}

export type XpReason =
  | "lock"
  | "correct"
  | "streak_3"
  | "streak_5"
  | "seven_battles";

export interface XpLedgerEntry {
  id: string;
  userId: string;
  battleId: string | null;
  reason: XpReason;
  amount: number;
  createdAt: string;
}

export interface SettlementRun {
  id: string;
  battleId: string;
  status: "running" | "succeeded" | "failed" | "skipped";
  source: string;
  triggeredBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  endPrice: number | null;
  error: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PriceSnapshot {
  id: string;
  assetId: string;
  price: number;
  capturedAt: string;
  source: string;
  kind: "start" | "end" | "reference" | "manual";
  battleId: string | null;
}

/** The identity of whoever is viewing the app. */
export interface Viewer {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  isAdmin: boolean;
  /** Demo guests are anonymous session identities in Demo Mode. */
  isGuest: boolean;
}

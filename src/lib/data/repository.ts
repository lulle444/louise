import type {
  AIPrediction,
  AIProfile,
  Asset,
  AuditLogEntry,
  Badge,
  Battle,
  BattleStatus,
  Prediction,
  PriceSnapshot,
  Profile,
  SettlementRun,
  Signal,
  UserBadge,
  XpLedgerEntry,
} from "../domain/types";

export class DuplicatePredictionError extends Error {
  constructor() {
    super("You have already locked a prediction for this Battle.");
    this.name = "DuplicatePredictionError";
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

export interface PredictionFilter {
  battleId?: string;
  battleIds?: string[];
  userId?: string;
}

export interface AIPredictionFilter {
  battleId?: string;
  battleIds?: string[];
  aiProfileId?: string;
}

export type NewPrediction = Omit<Prediction, "id" | "createdAt" | "result" | "battleScore" | "xpAwarded">;
export type NewAIPrediction = Omit<AIPrediction, "id">;
export type NewBattle = Omit<Battle, "id" | "createdAt" | "updatedAt">;

export interface ResultUpdate {
  id: string;
  result: Prediction["result"];
  battleScore: number | null;
  xpAwarded?: number | null;
}

/**
 * Storage abstraction shared by Demo Mode (in-memory, seeded) and Supabase.
 * All methods are server-only.
 */
export interface ArenaRepository {
  readonly kind: "demo" | "supabase";

  listAssets(): Promise<Asset[]>;
  listSignals(): Promise<Signal[]>;
  listAIProfiles(): Promise<AIProfile[]>;
  listBadges(): Promise<Badge[]>;

  listBattles(opts?: { includeUnpublished?: boolean }): Promise<Battle[]>;
  getBattle(idOrSlug: string): Promise<Battle | null>;
  createBattle(input: NewBattle): Promise<Battle>;
  updateBattle(id: string, patch: Partial<Omit<Battle, "id" | "createdAt">>): Promise<Battle>;
  /** Conditional transition: applies `patch` only if the current status is in `from`. Returns null if not applied. */
  transitionBattle(id: string, from: BattleStatus[], patch: Partial<Omit<Battle, "id" | "createdAt">>): Promise<Battle | null>;

  listPredictions(filter?: PredictionFilter): Promise<Prediction[]>;
  getPrediction(id: string): Promise<Prediction | null>;
  createPrediction(input: NewPrediction): Promise<Prediction>;
  updatePredictionResults(updates: ResultUpdate[]): Promise<void>;

  listAIPredictions(filter?: AIPredictionFilter): Promise<AIPrediction[]>;
  getAIPrediction(id: string): Promise<AIPrediction | null>;
  /** Inserts if absent; returns the existing row otherwise (never overwrites a locked forecast). */
  insertAIPredictionIfAbsent(input: NewAIPrediction): Promise<AIPrediction>;
  updateAIPredictionResults(updates: ResultUpdate[]): Promise<void>;

  listProfiles(): Promise<Profile[]>;
  getProfileById(id: string): Promise<Profile | null>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  updateProfile(id: string, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarUrl" | "xp" | "currentStreak" | "longestStreak">>): Promise<Profile>;

  listUserBadges(userId?: string): Promise<UserBadge[]>;
  /** Returns true if newly awarded, false if already held. */
  awardBadge(entry: UserBadge): Promise<boolean>;

  listXpLedger(userId?: string): Promise<XpLedgerEntry[]>;
  /** Inserts entries, skipping any (user, battle, reason) that already exists. Returns the inserted entries. */
  addXpEntries(entries: Array<Omit<XpLedgerEntry, "id" | "createdAt">>): Promise<XpLedgerEntry[]>;

  listSettlementRuns(battleId?: string): Promise<SettlementRun[]>;
  createSettlementRun(run: Omit<SettlementRun, "id">): Promise<SettlementRun>;
  updateSettlementRun(id: string, patch: Partial<Omit<SettlementRun, "id">>): Promise<void>;

  addPriceSnapshot(snapshot: Omit<PriceSnapshot, "id">): Promise<PriceSnapshot>;
  listPriceSnapshots(battleId?: string): Promise<PriceSnapshot[]>;

  appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void>;
  listAudit(limit?: number): Promise<AuditLogEntry[]>;
}

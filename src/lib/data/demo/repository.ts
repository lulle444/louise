import { AI_PROFILES, ASSETS, SIGNALS } from "../../domain/catalogue";
import { BADGE_CATALOGUE } from "../../domain/badges";
import type {
  AIPrediction,
  AuditLogEntry,
  Battle,
  BattleStatus,
  Prediction,
  PriceSnapshot,
  Profile,
  SettlementRun,
  UserBadge,
  XpLedgerEntry,
} from "../../domain/types";
import { DuplicatePredictionError, NotFoundError, type AIPredictionFilter, type ArenaRepository, type NewAIPrediction, type NewBattle, type NewPrediction, type PredictionFilter, type ResultUpdate } from "../repository";
import { nextId, type DemoState } from "./store";

/**
 * Per-request overlay. In Demo Mode the browser session carries the viewer's
 * own profile, predictions, XP entries and badges in a cookie so the core
 * loop survives serverless cold starts where in-memory state resets.
 */
export interface DemoOverlay {
  profiles: Profile[];
  predictions: Prediction[];
  xpLedger: XpLedgerEntry[];
  userBadges: UserBadge[];
}

export const emptyOverlay = (): DemoOverlay => ({ profiles: [], predictions: [], xpLedger: [], userBadges: [] });

function mergeById<T extends { id: string }>(base: T[], overlay: T[]): T[] {
  if (overlay.length === 0) return base;
  const map = new Map(base.map((x) => [x.id, x]));
  for (const o of overlay) map.set(o.id, o);
  return [...map.values()];
}

export class DemoRepository implements ArenaRepository {
  readonly kind = "demo" as const;

  constructor(
    private readonly state: DemoState,
    private readonly overlay: DemoOverlay = emptyOverlay(),
  ) {}

  private now(): string {
    return new Date().toISOString();
  }

  private allPredictions(): Prediction[] {
    return mergeById(this.state.predictions, this.overlay.predictions);
  }

  private allProfiles(): Profile[] {
    return mergeById(this.state.profiles, this.overlay.profiles);
  }

  private allLedger(): XpLedgerEntry[] {
    return mergeById(this.state.xpLedger, this.overlay.xpLedger);
  }

  private allBadges(): UserBadge[] {
    const key = (b: UserBadge) => `${b.userId}:${b.badgeId}`;
    const map = new Map(this.state.userBadges.map((b) => [key(b), b]));
    for (const b of this.overlay.userBadges) map.set(key(b), b);
    return [...map.values()];
  }

  async listAssets() {
    return ASSETS.filter((a) => a.active);
  }
  async listSignals() {
    return SIGNALS;
  }
  async listAIProfiles() {
    return AI_PROFILES;
  }
  async listBadges() {
    return BADGE_CATALOGUE;
  }

  async listBattles(opts?: { includeUnpublished?: boolean }) {
    const all = [...this.state.battles];
    const visible = opts?.includeUnpublished ? all : all.filter((b) => b.status !== "draft" && b.status !== "archived");
    return visible.sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt));
  }

  async getBattle(idOrSlug: string) {
    return this.state.battles.find((b) => b.id === idOrSlug || b.slug === idOrSlug) ?? null;
  }

  async createBattle(input: NewBattle) {
    const id = nextId(this.state, "round");
    const ts = this.now();
    const battle: Battle = { ...input, id, slug: input.slug || id, createdAt: ts, updatedAt: ts };
    this.state.battles.push(battle);
    return battle;
  }

  async updateBattle(id: string, patch: Partial<Omit<Battle, "id" | "createdAt">>) {
    const idx = this.state.battles.findIndex((b) => b.id === id);
    if (idx < 0) throw new NotFoundError("Round");
    const updated: Battle = { ...this.state.battles[idx], ...patch, updatedAt: this.now() };
    this.state.battles[idx] = updated;
    return updated;
  }

  async transitionBattle(id: string, from: BattleStatus[], patch: Partial<Omit<Battle, "id" | "createdAt">>) {
    const current = this.state.battles.find((b) => b.id === id);
    if (!current || !from.includes(current.status)) return null;
    return this.updateBattle(id, patch);
  }

  async listPredictions(filter: PredictionFilter = {}) {
    return this.allPredictions().filter(
      (p) =>
        (!filter.battleId || p.battleId === filter.battleId) &&
        (!filter.battleIds || filter.battleIds.includes(p.battleId)) &&
        (!filter.userId || p.userId === filter.userId),
    );
  }

  async getPrediction(id: string) {
    return this.allPredictions().find((p) => p.id === id) ?? null;
  }

  async createPrediction(input: NewPrediction) {
    if (this.allPredictions().some((p) => p.battleId === input.battleId && p.userId === input.userId)) {
      throw new DuplicatePredictionError();
    }
    const prediction: Prediction = {
      ...input,
      id: `pred-${input.battleId}-${input.userId}`.replace(/[^a-zA-Z0-9-_]/g, ""),
      result: "pending",
      battleScore: null,
      xpAwarded: null,
      createdAt: this.now(),
    };
    this.state.predictions.push(prediction);
    return prediction;
  }

  async updatePredictionResults(updates: ResultUpdate[]) {
    for (const u of updates) {
      const p = this.state.predictions.find((x) => x.id === u.id);
      if (p) {
        p.result = u.result;
        p.battleScore = u.battleScore;
        if (u.xpAwarded !== undefined) p.xpAwarded = u.xpAwarded;
      }
      const o = this.overlay.predictions.find((x) => x.id === u.id);
      if (o) {
        o.result = u.result;
        o.battleScore = u.battleScore;
        if (u.xpAwarded !== undefined) o.xpAwarded = u.xpAwarded;
      }
    }
  }

  async listAIPredictions(filter: AIPredictionFilter = {}) {
    return this.state.aiPredictions.filter(
      (p) =>
        (!filter.battleId || p.battleId === filter.battleId) &&
        (!filter.battleIds || filter.battleIds.includes(p.battleId)) &&
        (!filter.aiProfileId || p.aiProfileId === filter.aiProfileId),
    );
  }

  async getAIPrediction(id: string) {
    return this.state.aiPredictions.find((p) => p.id === id) ?? null;
  }

  async insertAIPredictionIfAbsent(input: NewAIPrediction) {
    const existing = this.state.aiPredictions.find((p) => p.battleId === input.battleId && p.aiProfileId === input.aiProfileId);
    if (existing) return existing;
    const created: AIPrediction = { ...input, id: `aipred-${input.battleId}-${input.aiProfileId}` };
    this.state.aiPredictions.push(created);
    return created;
  }

  async updateAIPredictionResults(updates: ResultUpdate[]) {
    for (const u of updates) {
      const p = this.state.aiPredictions.find((x) => x.id === u.id);
      if (p) {
        p.result = u.result;
        p.battleScore = u.battleScore;
      }
    }
  }

  async listProfiles() {
    return this.allProfiles();
  }

  async getProfileById(id: string) {
    return this.allProfiles().find((p) => p.id === id) ?? null;
  }

  async getProfileByUsername(username: string) {
    const u = username.toLowerCase();
    return this.allProfiles().find((p) => p.username.toLowerCase() === u) ?? null;
  }

  async updateProfile(id: string, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarUrl" | "xp" | "currentStreak" | "longestStreak">>) {
    let target = this.state.profiles.find((p) => p.id === id);
    if (!target) {
      const fromOverlay = this.overlay.profiles.find((p) => p.id === id);
      if (!fromOverlay) throw new NotFoundError("Profile");
      target = { ...fromOverlay };
      this.state.profiles.push(target);
    }
    Object.assign(target, patch, { updatedAt: this.now() });
    const o = this.overlay.profiles.find((p) => p.id === id);
    if (o) Object.assign(o, patch, { updatedAt: target.updatedAt });
    return { ...target };
  }

  /** Demo-only helper used to register a guest/session profile in memory. */
  ensureProfile(profile: Profile): Profile {
    const existing = this.state.profiles.find((p) => p.id === profile.id);
    if (existing) return existing;
    this.state.profiles.push(profile);
    return profile;
  }

  async listUserBadges(userId?: string) {
    return this.allBadges().filter((b) => !userId || b.userId === userId);
  }

  async awardBadge(entry: UserBadge) {
    if (this.allBadges().some((b) => b.userId === entry.userId && b.badgeId === entry.badgeId)) return false;
    this.state.userBadges.push(entry);
    return true;
  }

  async listXpLedger(userId?: string) {
    return this.allLedger().filter((e) => !userId || e.userId === userId);
  }

  async addXpEntries(entries: Array<Omit<XpLedgerEntry, "id" | "createdAt">>) {
    const inserted: XpLedgerEntry[] = [];
    const existing = new Set(this.allLedger().map((e) => `${e.userId}:${e.battleId ?? "-"}:${e.reason}`));
    for (const e of entries) {
      const key = `${e.userId}:${e.battleId ?? "-"}:${e.reason}`;
      if (existing.has(key)) continue;
      existing.add(key);
      const row: XpLedgerEntry = { ...e, id: nextId(this.state, "xp"), createdAt: this.now() };
      this.state.xpLedger.push(row);
      inserted.push(row);
    }
    return inserted;
  }

  async listSettlementRuns(battleId?: string) {
    return this.state.settlementRuns.filter((r) => !battleId || r.battleId === battleId).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }

  async createSettlementRun(run: Omit<SettlementRun, "id">) {
    const row: SettlementRun = { ...run, id: nextId(this.state, "run") };
    this.state.settlementRuns.push(row);
    return row;
  }

  async updateSettlementRun(id: string, patch: Partial<Omit<SettlementRun, "id">>) {
    const r = this.state.settlementRuns.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
  }

  async addPriceSnapshot(snapshot: Omit<PriceSnapshot, "id">) {
    const row: PriceSnapshot = { ...snapshot, id: nextId(this.state, "snap") };
    this.state.priceSnapshots.push(row);
    return row;
  }

  async listPriceSnapshots(battleId?: string) {
    return this.state.priceSnapshots.filter((s) => !battleId || s.battleId === battleId);
  }

  async appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">) {
    this.state.audit.push({ ...entry, id: nextId(this.state, "audit"), createdAt: this.now() });
  }

  async listAudit(limit = 50) {
    return [...this.state.audit].reverse().slice(0, limit);
  }
}

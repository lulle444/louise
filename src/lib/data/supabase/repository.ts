import type { SupabaseClient } from "@supabase/supabase-js";
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
} from "../../domain/types";
import { DuplicatePredictionError, NotFoundError, type AIPredictionFilter, type ArenaRepository, type NewAIPrediction, type NewBattle, type NewPrediction, type PredictionFilter, type ResultUpdate } from "../repository";

type Row = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

function mapAsset(r: Row): Asset {
  return { id: String(r.id), symbol: String(r.symbol) as Asset["symbol"], name: String(r.name), providerId: String(r.provider_id), logoUrl: str(r.logo_url), priceDecimals: Number(r.price_decimals ?? 2), active: Boolean(r.active) };
}
function mapSignal(r: Row): Signal {
  return { id: String(r.id), slug: String(r.slug), name: String(r.name), description: String(r.description), icon: String(r.icon), accentColor: String(r.accent_color), active: Boolean(r.active) };
}
function mapAIProfile(r: Row): AIProfile {
  return { id: String(r.id), slug: String(r.slug), name: String(r.name), tagline: String(r.tagline ?? ""), description: String(r.description), strategyType: String(r.strategy_type), strategyVersion: String(r.strategy_version), accentColor: String(r.accent_color), prefers: (r.prefers as string[]) ?? [], active: Boolean(r.active) };
}
function mapBadge(r: Row): Badge {
  return { id: String(r.id), slug: String(r.slug), name: String(r.name), description: String(r.description), icon: String(r.icon) };
}
function mapBattle(r: Row): Battle {
  return {
    id: String(r.id),
    assetId: String(r.asset_id),
    title: String(r.title),
    slug: String(r.slug),
    battleType: "daily",
    status: String(r.status) as BattleStatus,
    opensAt: new Date(String(r.opens_at)).toISOString(),
    locksAt: new Date(String(r.locks_at)).toISOString(),
    endsAt: new Date(String(r.ends_at)).toISOString(),
    neutralThresholdPercent: Number(r.neutral_threshold_percent),
    startPrice: num(r.start_price),
    startPriceAt: r.start_price_at ? new Date(String(r.start_price_at)).toISOString() : null,
    endPrice: num(r.end_price),
    endPriceAt: r.end_price_at ? new Date(String(r.end_price_at)).toISOString() : null,
    outcome: (str(r.outcome) as Battle["outcome"]) ?? null,
    settlementSource: str(r.settlement_source),
    settlementError: str(r.settlement_error),
    aiProfileIds: (r.ai_profile_ids as string[]) ?? [],
    createdBy: str(r.created_by),
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  };
}
function battleToRow(b: Partial<Omit<Battle, "id" | "createdAt">>): Row {
  const row: Row = {};
  if (b.assetId !== undefined) row.asset_id = b.assetId;
  if (b.title !== undefined) row.title = b.title;
  if (b.slug !== undefined) row.slug = b.slug;
  if (b.battleType !== undefined) row.battle_type = b.battleType;
  if (b.status !== undefined) row.status = b.status;
  if (b.opensAt !== undefined) row.opens_at = b.opensAt;
  if (b.locksAt !== undefined) row.locks_at = b.locksAt;
  if (b.endsAt !== undefined) row.ends_at = b.endsAt;
  if (b.neutralThresholdPercent !== undefined) row.neutral_threshold_percent = b.neutralThresholdPercent;
  if (b.startPrice !== undefined) row.start_price = b.startPrice;
  if (b.startPriceAt !== undefined) row.start_price_at = b.startPriceAt;
  if (b.endPrice !== undefined) row.end_price = b.endPrice;
  if (b.endPriceAt !== undefined) row.end_price_at = b.endPriceAt;
  if (b.outcome !== undefined) row.outcome = b.outcome;
  if (b.settlementSource !== undefined) row.settlement_source = b.settlementSource;
  if (b.settlementError !== undefined) row.settlement_error = b.settlementError;
  if (b.aiProfileIds !== undefined) row.ai_profile_ids = b.aiProfileIds;
  if (b.createdBy !== undefined) row.created_by = b.createdBy;
  row.updated_at = new Date().toISOString();
  return row;
}
function mapPrediction(r: Row): Prediction {
  const sigs = (r.prediction_signals as Array<{ signal_id: string }> | undefined) ?? [];
  return {
    id: String(r.id),
    battleId: String(r.battle_id),
    userId: String(r.user_id),
    direction: String(r.direction) as Prediction["direction"],
    signalIds: sigs.map((s) => s.signal_id),
    confidence: Number(r.confidence),
    thesis: str(r.thesis),
    referencePrice: num(r.reference_price),
    lockedAt: new Date(String(r.locked_at)).toISOString(),
    result: String(r.result) as Prediction["result"],
    battleScore: num(r.battle_score),
    xpAwarded: num(r.xp_awarded),
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}
function mapAIPrediction(r: Row): AIPrediction {
  return {
    id: String(r.id),
    battleId: String(r.battle_id),
    aiProfileId: String(r.ai_profile_id),
    direction: String(r.direction) as AIPrediction["direction"],
    signalIds: (r.signal_ids as string[]) ?? [],
    confidence: Number(r.confidence),
    thesis: str(r.thesis),
    referencePrice: num(r.reference_price),
    lockedAt: new Date(String(r.locked_at)).toISOString(),
    generatedAt: new Date(String(r.generated_at)).toISOString(),
    strategyVersion: String(r.strategy_version),
    inputSnapshot: (r.input_snapshot as AIPrediction["inputSnapshot"]) ?? {},
    result: String(r.result) as AIPrediction["result"],
    battleScore: num(r.battle_score),
  };
}
function mapProfile(r: Row): Profile {
  return {
    id: String(r.id),
    username: String(r.username),
    displayName: String(r.display_name),
    avatarUrl: str(r.avatar_url),
    bio: str(r.bio),
    xp: Number(r.xp ?? 0),
    currentStreak: Number(r.current_streak ?? 0),
    longestStreak: Number(r.longest_streak ?? 0),
    isAdmin: Boolean(r.is_admin),
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  };
}
function mapUserBadge(r: Row): UserBadge {
  return { userId: String(r.user_id), badgeId: String(r.badge_id), awardedAt: new Date(String(r.awarded_at)).toISOString(), sourceBattleId: str(r.source_battle_id) };
}
function mapLedger(r: Row): XpLedgerEntry {
  return { id: String(r.id), userId: String(r.user_id), battleId: str(r.battle_id), reason: String(r.reason) as XpLedgerEntry["reason"], amount: Number(r.amount), createdAt: new Date(String(r.created_at)).toISOString() };
}
function mapRun(r: Row): SettlementRun {
  return { id: String(r.id), battleId: String(r.battle_id), status: String(r.status) as SettlementRun["status"], source: String(r.source), triggeredBy: str(r.triggered_by), startedAt: new Date(String(r.started_at)).toISOString(), finishedAt: r.finished_at ? new Date(String(r.finished_at)).toISOString() : null, endPrice: num(r.end_price), error: str(r.error) };
}
function mapSnapshot(r: Row): PriceSnapshot {
  return { id: String(r.id), assetId: String(r.asset_id), battleId: str(r.battle_id), price: Number(r.price), capturedAt: new Date(String(r.captured_at)).toISOString(), source: String(r.source), kind: String(r.kind) as PriceSnapshot["kind"] };
}
function mapAudit(r: Row): AuditLogEntry {
  return { id: String(r.id), actorId: str(r.actor_id), action: String(r.action), targetType: String(r.target_type), targetId: str(r.target_id), details: (r.details as Record<string, unknown>) ?? {}, createdAt: new Date(String(r.created_at)).toISOString() };
}

const PREDICTION_SELECT = "*, prediction_signals(signal_id)";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Supabase-backed repository. `admin` is the service-role client used for all
 * server-side reads and scoring writes; `user` is the viewer's session client
 * used to lock predictions so RLS and the lock_prediction RPC enforce rules.
 */
export class SupabaseRepository implements ArenaRepository {
  readonly kind = "supabase" as const;

  constructor(
    private readonly admin: SupabaseClient,
    private readonly user: SupabaseClient | null,
  ) {}

  private async rows<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>, map: (r: Row) => T): Promise<T[]> {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data as Row[]) ?? []).map(map);
  }

  async listAssets() {
    return this.rows(this.admin.from("assets").select("*").eq("active", true).order("symbol"), mapAsset);
  }
  async listSignals() {
    return this.rows(this.admin.from("signals").select("*").order("name"), mapSignal);
  }
  async listAIProfiles() {
    return this.rows(this.admin.from("ai_profiles").select("*").order("name"), mapAIProfile);
  }
  async listBadges() {
    return this.rows(this.admin.from("badges").select("*"), mapBadge);
  }

  async listBattles(opts?: { includeUnpublished?: boolean }) {
    let q = this.admin.from("rounds").select("*").order("ends_at", { ascending: false });
    if (!opts?.includeUnpublished) q = q.not("status", "in", "(draft,archived)");
    return this.rows(q, mapBattle);
  }

  async getBattle(idOrSlug: string) {
    const q = isUuid(idOrSlug) ? this.admin.from("rounds").select("*").eq("id", idOrSlug) : this.admin.from("rounds").select("*").eq("slug", idOrSlug);
    const rows = await this.rows(q.limit(1), mapBattle);
    return rows[0] ?? null;
  }

  async createBattle(input: NewBattle) {
    const { data, error } = await this.admin.from("rounds").insert(battleToRow(input)).select("*").single();
    if (error) throw new Error(error.message);
    return mapBattle(data as Row);
  }

  async updateBattle(id: string, patch: Partial<Omit<Battle, "id" | "createdAt">>) {
    const { data, error } = await this.admin.from("rounds").update(battleToRow(patch)).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Round");
    return mapBattle(data as Row);
  }

  async transitionBattle(id: string, from: BattleStatus[], patch: Partial<Omit<Battle, "id" | "createdAt">>) {
    const { data, error } = await this.admin.from("rounds").update(battleToRow(patch)).eq("id", id).in("status", from).select("*");
    if (error) throw new Error(error.message);
    const rows = (data as Row[]) ?? [];
    return rows.length ? mapBattle(rows[0]) : null;
  }

  async listPredictions(filter: PredictionFilter = {}) {
    let q = this.admin.from("calls").select(PREDICTION_SELECT);
    if (filter.battleId) q = q.eq("battle_id", filter.battleId);
    if (filter.battleIds) q = q.in("battle_id", filter.battleIds);
    if (filter.userId) q = q.eq("user_id", filter.userId);
    return this.rows(q, mapPrediction);
  }

  async getPrediction(id: string) {
    if (!isUuid(id)) return null;
    const rows = await this.rows(this.admin.from("calls").select(PREDICTION_SELECT).eq("id", id).limit(1), mapPrediction);
    return rows[0] ?? null;
  }

  async createPrediction(input: NewPrediction) {
    if (this.user) {
      const { data, error } = await this.user.rpc("lock_prediction", {
        p_battle_id: input.battleId,
        p_direction: input.direction,
        p_signal_ids: input.signalIds,
        p_confidence: input.confidence,
        p_thesis: input.thesis,
        p_reference_price: input.referencePrice,
      });
      if (error) {
        if (/duplicate|already|unique/i.test(error.message)) throw new DuplicatePredictionError();
        throw new Error(error.message);
      }
      const created = await this.getPrediction(String(data));
      if (!created) throw new Error("Call was not created");
      return created;
    }
    // Service-role path (used by seeds/tests): insert prediction and signals.
    const { data, error } = await this.admin
      .from("calls")
      .insert({ battle_id: input.battleId, user_id: input.userId, direction: input.direction, confidence: input.confidence, thesis: input.thesis, reference_price: input.referencePrice, locked_at: input.lockedAt })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new DuplicatePredictionError();
      throw new Error(error.message);
    }
    const id = String((data as Row).id);
    const { error: sigErr } = await this.admin.from("prediction_signals").insert(input.signalIds.map((signal_id) => ({ prediction_id: id, signal_id })));
    if (sigErr) throw new Error(sigErr.message);
    const created = await this.getPrediction(id);
    if (!created) throw new Error("Call was not created");
    return created;
  }

  async updatePredictionResults(updates: ResultUpdate[]) {
    for (const u of updates) {
      const patch: Row = { result: u.result, battle_score: u.battleScore };
      if (u.xpAwarded !== undefined) patch.xp_awarded = u.xpAwarded;
      const { error } = await this.admin.from("calls").update(patch).eq("id", u.id);
      if (error) throw new Error(error.message);
    }
  }

  async listAIPredictions(filter: AIPredictionFilter = {}) {
    let q = this.admin.from("ai_predictions").select("*");
    if (filter.battleId) q = q.eq("battle_id", filter.battleId);
    if (filter.battleIds) q = q.in("battle_id", filter.battleIds);
    if (filter.aiProfileId) q = q.eq("ai_profile_id", filter.aiProfileId);
    return this.rows(q, mapAIPrediction);
  }

  async getAIPrediction(id: string) {
    if (!isUuid(id)) return null;
    const rows = await this.rows(this.admin.from("ai_predictions").select("*").eq("id", id).limit(1), mapAIPrediction);
    return rows[0] ?? null;
  }

  async insertAIPredictionIfAbsent(input: NewAIPrediction) {
    const existing = await this.rows(this.admin.from("ai_predictions").select("*").eq("battle_id", input.battleId).eq("ai_profile_id", input.aiProfileId).limit(1), mapAIPrediction);
    if (existing[0]) return existing[0];
    const { data, error } = await this.admin
      .from("ai_predictions")
      .insert({
        battle_id: input.battleId,
        ai_profile_id: input.aiProfileId,
        direction: input.direction,
        signal_ids: input.signalIds,
        confidence: input.confidence,
        thesis: input.thesis,
        reference_price: input.referencePrice,
        generated_at: input.generatedAt,
        locked_at: input.lockedAt,
        strategy_version: input.strategyVersion,
        input_snapshot: input.inputSnapshot,
        result: input.result,
        battle_score: input.battleScore,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        const again = await this.rows(this.admin.from("ai_predictions").select("*").eq("battle_id", input.battleId).eq("ai_profile_id", input.aiProfileId).limit(1), mapAIPrediction);
        if (again[0]) return again[0];
      }
      throw new Error(error.message);
    }
    return mapAIPrediction(data as Row);
  }

  async updateAIPredictionResults(updates: ResultUpdate[]) {
    for (const u of updates) {
      const { error } = await this.admin.from("ai_predictions").update({ result: u.result, battle_score: u.battleScore }).eq("id", u.id);
      if (error) throw new Error(error.message);
    }
  }

  async listProfiles() {
    return this.rows(this.admin.from("profiles").select("*"), mapProfile);
  }
  async getProfileById(id: string) {
    if (!isUuid(id)) return null;
    const rows = await this.rows(this.admin.from("profiles").select("*").eq("id", id).limit(1), mapProfile);
    return rows[0] ?? null;
  }
  async getProfileByUsername(username: string) {
    const rows = await this.rows(this.admin.from("profiles").select("*").ilike("username", username).limit(1), mapProfile);
    return rows[0] ?? null;
  }
  async updateProfile(id: string, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarUrl" | "xp" | "currentStreak" | "longestStreak">>) {
    const row: Row = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (patch.xp !== undefined) row.xp = patch.xp;
    if (patch.currentStreak !== undefined) row.current_streak = patch.currentStreak;
    if (patch.longestStreak !== undefined) row.longest_streak = patch.longestStreak;
    const { data, error } = await this.admin.from("profiles").update(row).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return mapProfile(data as Row);
  }

  async listUserBadges(userId?: string) {
    let q = this.admin.from("user_badges").select("*");
    if (userId) q = q.eq("user_id", userId);
    return this.rows(q, mapUserBadge);
  }
  async awardBadge(entry: UserBadge) {
    const { data, error } = await this.admin
      .from("user_badges")
      .upsert({ user_id: entry.userId, badge_id: entry.badgeId, awarded_at: entry.awardedAt, source_battle_id: entry.sourceBattleId }, { onConflict: "user_id,badge_id", ignoreDuplicates: true })
      .select("user_id");
    if (error) throw new Error(error.message);
    return ((data as Row[]) ?? []).length > 0;
  }

  async listXpLedger(userId?: string) {
    let q = this.admin.from("xp_ledger").select("*");
    if (userId) q = q.eq("user_id", userId);
    return this.rows(q, mapLedger);
  }
  async addXpEntries(entries: Array<Omit<XpLedgerEntry, "id" | "createdAt">>) {
    const inserted: XpLedgerEntry[] = [];
    for (const e of entries) {
      const { data, error } = await this.admin
        .from("xp_ledger")
        .insert({ user_id: e.userId, battle_id: e.battleId, reason: e.reason, amount: e.amount })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") continue; // already awarded
        throw new Error(error.message);
      }
      inserted.push(mapLedger(data as Row));
    }
    return inserted;
  }

  async listSettlementRuns(battleId?: string) {
    let q = this.admin.from("settlement_runs").select("*").order("started_at", { ascending: false }).limit(100);
    if (battleId) q = q.eq("battle_id", battleId);
    return this.rows(q, mapRun);
  }
  async createSettlementRun(run: Omit<SettlementRun, "id">) {
    const { data, error } = await this.admin
      .from("settlement_runs")
      .insert({ battle_id: run.battleId, status: run.status, source: run.source, triggered_by: run.triggeredBy && isUuid(run.triggeredBy) ? run.triggeredBy : null, started_at: run.startedAt, finished_at: run.finishedAt, end_price: run.endPrice, error: run.error })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRun(data as Row);
  }
  async updateSettlementRun(id: string, patch: Partial<Omit<SettlementRun, "id">>) {
    const row: Row = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.finishedAt !== undefined) row.finished_at = patch.finishedAt;
    if (patch.endPrice !== undefined) row.end_price = patch.endPrice;
    if (patch.error !== undefined) row.error = patch.error;
    const { error } = await this.admin.from("settlement_runs").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async addPriceSnapshot(snapshot: Omit<PriceSnapshot, "id">) {
    const { data, error } = await this.admin
      .from("price_snapshots")
      .insert({ asset_id: snapshot.assetId, battle_id: snapshot.battleId, price: snapshot.price, captured_at: snapshot.capturedAt, source: snapshot.source, kind: snapshot.kind })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapSnapshot(data as Row);
  }
  async listPriceSnapshots(battleId?: string) {
    let q = this.admin.from("price_snapshots").select("*").order("captured_at", { ascending: false }).limit(200);
    if (battleId) q = q.eq("battle_id", battleId);
    return this.rows(q, mapSnapshot);
  }

  async appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">) {
    const { error } = await this.admin.from("admin_audit_log").insert({ actor_id: entry.actorId && isUuid(entry.actorId) ? entry.actorId : null, action: entry.action, target_type: entry.targetType, target_id: entry.targetId, details: entry.details });
    if (error) throw new Error(error.message);
  }
  async listAudit(limit = 50) {
    return this.rows(this.admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limit), mapAudit);
  }
}

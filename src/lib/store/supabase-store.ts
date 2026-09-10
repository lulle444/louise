import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_PROFILES } from "@/lib/scoring/ai";
import { BADGES } from "@/lib/scoring/badges";
import { RACE_FORMULA_VERSION } from "@/lib/scoring/race-score";
import { isBeforeDeadline, validatePicks } from "@/lib/scoring/validation";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import type {
  AiProfile,
  AuditLogEntry,
  Badge,
  ConstituentVersion,
  Lineup,
  LineupPick,
  Narrative,
  NarrativeSnapshot,
  Profile,
  Race,
  RaceResult,
  RaceStatus,
  UserBadge,
  XpEntry,
} from "@/lib/types";
import { StoreError, type AdminActor, type CreateLineupInput, type CreateRaceInput, type DataStore } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function must(res: { data: unknown; error: { message: string } | null }, what: string): any {
  if (res.error) throw new StoreError(`${what}: ${res.error.message}`, "invalid");
  if (res.data === null || res.data === undefined) throw new StoreError(`${what}: no data`, "not_found");
  return res.data;
}

const mapNarrative = (r: Row): Narrative => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  shortName: r.short_name,
  description: r.description,
  icon: r.icon,
  accentColor: r.accent_color,
  active: r.active,
  currentConstituentVersionId: r.current_constituent_version_id,
});
const mapRace = (r: Row): Race => ({
  id: r.id,
  number: r.number,
  name: r.name,
  status: r.status,
  publishedAt: r.published_at,
  locksAt: r.locks_at,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  settledAt: r.settled_at,
  voidReason: r.void_reason,
  formulaVersion: r.formula_version,
  featured: r.featured,
  isDemo: r.is_demo,
});
const mapSnapshot = (r: Row): NarrativeSnapshot => ({
  id: r.id,
  raceId: r.race_id,
  narrativeId: r.narrative_id,
  kind: r.kind,
  takenAt: r.taken_at,
  raw: r.raw,
  normalized: r.normalized,
  score: Number(r.score),
  rank: r.rank,
  source: r.source,
  constituentVersionId: r.constituent_version_id,
  formulaVersion: r.formula_version,
  quality: r.quality,
});
const mapLineup = (r: Row): Lineup => ({
  id: r.id,
  raceId: r.race_id,
  kind: r.kind,
  userId: r.user_id,
  aiProfileId: r.ai_profile_id,
  thesis: r.thesis,
  createdAt: r.created_at,
  lockedAt: r.locked_at,
  status: r.status,
  strategyVersion: r.strategy_version,
  inputSnapshotId: r.input_snapshot_id,
  picks: ((r.lineup_picks as Row[] | undefined) ?? [])
    .map((p) => ({ role: p.role, narrativeId: p.narrative_id, energy: p.energy }) as LineupPick)
    .sort((a, b) => ["leader", "challenger", "wildcard"].indexOf(a.role) - ["leader", "challenger", "wildcard"].indexOf(b.role)),
});
const mapResult = (r: Row): RaceResult => ({
  id: r.id,
  raceId: r.race_id,
  lineupId: r.lineup_id,
  userId: r.user_id,
  aiProfileId: r.ai_profile_id,
  raceScore: Number(r.race_score),
  leaderPoints: Number(r.leader_points),
  challengerPoints: Number(r.challenger_points),
  wildcardPoints: Number(r.wildcard_points),
  leaderFinish: r.leader_finish,
  challengerFinish: r.challenger_finish,
  wildcardFinish: r.wildcard_finish,
  wildcardStart: r.wildcard_start,
  leaderHit: r.leader_hit,
  challengerHit: r.challenger_hit,
  wildcardHit: r.wildcard_hit,
  bestRole: r.best_role,
  xpAwarded: r.xp_awarded,
  rank: r.rank,
  settledAt: r.settled_at,
  formulaVersion: r.formula_version,
});
const mapXp = (r: Row): XpEntry => ({
  id: r.id,
  userId: r.user_id,
  raceId: r.race_id,
  reason: r.reason,
  amount: r.amount,
  createdAt: r.created_at,
  idempotencyKey: r.idempotency_key,
});
const mapProfile = (r: Row): Profile => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  avatarSeed: r.avatar_seed,
  bio: r.bio,
  createdAt: r.created_at,
  isDemo: r.is_demo,
});
const mapVersion = (r: Row): ConstituentVersion => ({
  id: r.id,
  narrativeId: r.narrative_id,
  version: r.version,
  createdAt: r.created_at,
  note: r.note ?? "",
  constituents: ((r.narrative_constituents as Row[] | undefined) ?? []).map((c) => ({
    assetId: c.asset_id,
    symbol: c.assets?.symbol ?? c.symbol,
    name: c.assets?.name ?? c.name,
    weight: Number(c.weight),
  })),
});

const LINEUP_SELECT = "*, lineup_picks(*)";
const VERSION_SELECT = "*, narrative_constituents(*, assets(symbol,name))";

/**
 * Supabase-backed store. Reads use the cookie-bound user client (RLS applies);
 * privileged writes (snapshots, settlement, AI lineups, XP, badges, audit)
 * use the service-role client, which is only available on the server.
 */
export class SupabaseStore implements DataStore {
  readonly kind = "supabase" as const;

  private async user(): Promise<SupabaseClient> {
    const c = await createUserClient();
    if (!c) throw new StoreError("Supabase is not configured", "invalid");
    return c;
  }
  private service(): SupabaseClient {
    const c = createServiceClient();
    if (!c) throw new StoreError("SUPABASE_SERVICE_ROLE_KEY is required for this operation", "forbidden");
    return c;
  }

  async listNarratives(): Promise<Narrative[]> {
    const db = await this.user();
    return must(await db.from("narratives").select("*").order("name"), "narratives").map(mapNarrative);
  }
  async getNarrativeBySlug(slug: string): Promise<Narrative | null> {
    const db = await this.user();
    const { data } = await db.from("narratives").select("*").eq("slug", slug).maybeSingle();
    return data ? mapNarrative(data) : null;
  }
  async getConstituentVersion(id: string): Promise<ConstituentVersion | null> {
    const db = await this.user();
    const { data } = await db.from("narrative_constituent_versions").select(VERSION_SELECT).eq("id", id).maybeSingle();
    return data ? mapVersion(data) : null;
  }
  async listConstituentVersions(narrativeId: string): Promise<ConstituentVersion[]> {
    const db = await this.user();
    return must(
      await db.from("narrative_constituent_versions").select(VERSION_SELECT).eq("narrative_id", narrativeId).order("version"),
      "versions",
    ).map(mapVersion);
  }
  async updateNarrative(id: string, patch: Partial<Pick<Narrative, "name" | "description" | "active" | "accentColor">>, actor: AdminActor): Promise<Narrative> {
    const db = this.service();
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.accentColor !== undefined) row.accent_color = patch.accentColor;
    const data = must(await db.from("narratives").update(row).eq("id", id).select("*").single(), "narrative update");
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "narrative.update", targetType: "narrative", targetId: id, details: patch });
    return mapNarrative(data);
  }
  async createConstituentVersion(narrativeId: string, constituents: ConstituentVersion["constituents"], note: string, actor: AdminActor): Promise<ConstituentVersion> {
    const db = this.service();
    const live = must(await db.from("races").select("id").eq("status", "live").limit(1), "live check");
    if (live.length) throw new StoreError("Constituents cannot change while a Race is live", "state");
    const existing = await this.listConstituentVersions(narrativeId);
    const version = (existing[existing.length - 1]?.version ?? 0) + 1;
    const v = must(
      await db.from("narrative_constituent_versions").insert({ narrative_id: narrativeId, version, note }).select("*").single(),
      "create version",
    );
    must(
      await db.from("narrative_constituents").insert(constituents.map((c) => ({ version_id: v.id, asset_id: c.assetId, weight: c.weight }))),
      "insert constituents",
    );
    must(await db.from("narratives").update({ current_constituent_version_id: v.id }).eq("id", narrativeId), "set version");
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "narrative.constituents", targetType: "narrative", targetId: narrativeId, details: { version, note } });
    return (await this.getConstituentVersion(v.id))!;
  }

  async listRaces(opts?: { includeDrafts?: boolean }): Promise<Race[]> {
    const db = opts?.includeDrafts ? this.service() : await this.user();
    let q = db.from("races").select("*").order("starts_at", { ascending: false });
    if (!opts?.includeDrafts) q = q.neq("status", "draft");
    return must(await q, "races").map(mapRace);
  }
  async getRace(id: string): Promise<Race | null> {
    const db = await this.user();
    const { data } = await db.from("races").select("*").eq("id", id).maybeSingle();
    return data ? mapRace(data) : null;
  }
  async createRace(input: CreateRaceInput, actor: AdminActor): Promise<Race> {
    const db = this.service();
    const { data: max } = (await db.from("races").select("number").order("number", { ascending: false }).limit(1).maybeSingle()) as { data: Row | null };
    const data = must(
      await db
        .from("races")
        .insert({
          number: (max?.number ?? 0) + 1,
          name: input.name,
          status: "draft",
          locks_at: input.locksAt,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          formula_version: RACE_FORMULA_VERSION,
          featured: input.featured ?? false,
          is_demo: false,
        })
        .select("*")
        .single(),
      "create race",
    );
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "race.create", targetType: "race", targetId: data.id, details: { name: input.name } });
    return mapRace(data);
  }
  async setRaceStatus(id: string, status: RaceStatus, actor: AdminActor, details: Record<string, unknown> = {}): Promise<Race> {
    const db = this.service();
    const patch: Row = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    if (status === "settled") patch.settled_at = new Date().toISOString();
    if (status === "void") patch.void_reason = String(details.reason ?? "Voided by admin");
    const data = must(await db.from("races").update(patch).eq("id", id).select("*").single(), "race status");
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: `race.${status}`, targetType: "race", targetId: id, details });
    return mapRace(data);
  }
  async setRaceFeatured(id: string, featured: boolean, actor: AdminActor): Promise<Race> {
    const db = this.service();
    const data = must(await db.from("races").update({ featured }).eq("id", id).select("*").single(), "race featured");
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "race.featured", targetType: "race", targetId: id, details: { featured } });
    return mapRace(data);
  }

  async listSnapshots(raceId: string): Promise<NarrativeSnapshot[]> {
    const db = await this.user();
    return must(await db.from("narrative_snapshots").select("*").eq("race_id", raceId).order("taken_at"), "snapshots").map(mapSnapshot);
  }
  async insertSnapshots(snapshots: NarrativeSnapshot[]): Promise<void> {
    const db = this.service();
    must(
      await db.from("narrative_snapshots").insert(
        snapshots.map((s) => ({
          id: s.id,
          race_id: s.raceId,
          narrative_id: s.narrativeId,
          kind: s.kind,
          taken_at: s.takenAt,
          raw: s.raw,
          normalized: s.normalized,
          score: s.score,
          rank: s.rank,
          source: s.source,
          constituent_version_id: s.constituentVersionId,
          formula_version: s.formulaVersion,
          quality: s.quality,
        })),
      ),
      "insert snapshots",
    );
  }

  async listLineups(raceId: string): Promise<Lineup[]> {
    const db = await this.user();
    return must(await db.from("lineups").select(LINEUP_SELECT).eq("race_id", raceId), "lineups").map(mapLineup);
  }
  async listLineupsForUser(userId: string): Promise<Lineup[]> {
    const db = await this.user();
    return must(await db.from("lineups").select(LINEUP_SELECT).eq("user_id", userId), "user lineups").map(mapLineup);
  }
  async getLineup(id: string): Promise<Lineup | null> {
    const db = await this.user();
    const { data } = await db.from("lineups").select(LINEUP_SELECT).eq("id", id).maybeSingle();
    return data ? mapLineup(data) : null;
  }
  async getUserLineup(raceId: string, userId: string): Promise<Lineup | null> {
    const db = await this.user();
    const { data } = await db.from("lineups").select(LINEUP_SELECT).eq("race_id", raceId).eq("user_id", userId).maybeSingle();
    return data ? mapLineup(data) : null;
  }
  async createLineup(input: CreateLineupInput, nowIso: string): Promise<Lineup> {
    const race = await this.getRace(input.raceId);
    if (!race) throw new StoreError("Race not found", "not_found");
    if (race.status !== "published") throw new StoreError("This Race is not accepting lineups", "state");
    if (!isBeforeDeadline(nowIso, race.locksAt)) throw new StoreError("The lock deadline has passed", "deadline_passed");
    const problems = validatePicks(input.picks);
    if (problems.length) throw new StoreError(problems.join(" "), "invalid");
    const db = await this.user();
    // The `lock_lineup` RPC inserts lineup + picks atomically and re-checks every rule in SQL.
    const { data, error } = await db.rpc("lock_lineup", {
      p_race_id: input.raceId,
      p_thesis: input.thesis,
      p_picks: input.picks.map((p) => ({ role: p.role, narrative_id: p.narrativeId, energy: p.energy })),
    });
    if (error) {
      const code = /already/i.test(error.message) ? "duplicate" : /deadline|lock/i.test(error.message) ? "deadline_passed" : "invalid";
      throw new StoreError(error.message, code);
    }
    const lineup = await this.getLineup(data as string);
    if (!lineup) throw new StoreError("Lineup was not created", "invalid");
    return lineup;
  }
  async insertAiLineups(lineups: Lineup[]): Promise<void> {
    const db = this.service();
    for (const l of lineups) {
      must(
        await db.from("lineups").insert({
          id: l.id,
          race_id: l.raceId,
          kind: "ai",
          user_id: null,
          ai_profile_id: l.aiProfileId,
          thesis: null,
          created_at: l.createdAt,
          locked_at: l.lockedAt,
          status: l.status,
          strategy_version: l.strategyVersion,
          input_snapshot_id: l.inputSnapshotId,
        }),
        "insert ai lineup",
      );
      must(
        await db.from("lineup_picks").insert(l.picks.map((p) => ({ lineup_id: l.id, role: p.role, narrative_id: p.narrativeId, energy: p.energy }))),
        "insert ai picks",
      );
    }
  }
  async updateLineupStatus(raceId: string, status: Lineup["status"]): Promise<void> {
    const db = this.service();
    must(await db.from("lineups").update({ status }).eq("race_id", raceId), "lineup status");
  }

  async listAiProfiles(): Promise<AiProfile[]> {
    return AI_PROFILES;
  }

  async listResults(raceId: string): Promise<RaceResult[]> {
    const db = await this.user();
    return must(await db.from("race_results").select("*").eq("race_id", raceId).order("rank"), "results").map(mapResult);
  }
  async listResultsForUser(userId: string): Promise<RaceResult[]> {
    const db = await this.user();
    return must(await db.from("race_results").select("*").eq("user_id", userId), "user results").map(mapResult);
  }
  async listAllResults(): Promise<RaceResult[]> {
    const db = await this.user();
    return must(await db.from("race_results").select("*"), "all results").map(mapResult);
  }
  async insertResults(results: RaceResult[]): Promise<void> {
    if (!results.length) return;
    const db = this.service();
    must(
      await db.from("race_results").insert(
        results.map((r) => ({
          id: r.id,
          race_id: r.raceId,
          lineup_id: r.lineupId,
          user_id: r.userId,
          ai_profile_id: r.aiProfileId,
          race_score: r.raceScore,
          leader_points: r.leaderPoints,
          challenger_points: r.challengerPoints,
          wildcard_points: r.wildcardPoints,
          leader_finish: r.leaderFinish,
          challenger_finish: r.challengerFinish,
          wildcard_finish: r.wildcardFinish,
          wildcard_start: r.wildcardStart,
          leader_hit: r.leaderHit,
          challenger_hit: r.challengerHit,
          wildcard_hit: r.wildcardHit,
          best_role: r.bestRole,
          xp_awarded: r.xpAwarded,
          rank: r.rank,
          settled_at: r.settledAt,
          formula_version: r.formulaVersion,
        })),
      ),
      "insert results",
    );
  }
  async listXp(userId?: string): Promise<XpEntry[]> {
    const db = await this.user();
    let q = db.from("xp_ledger").select("*");
    if (userId) q = q.eq("user_id", userId);
    return must(await q, "xp").map(mapXp);
  }
  async insertXp(entries: XpEntry[]): Promise<void> {
    if (!entries.length) return;
    const db = this.service();
    must(
      await db.from("xp_ledger").upsert(
        entries.map((e) => ({
          id: e.id,
          user_id: e.userId,
          race_id: e.raceId,
          reason: e.reason,
          amount: e.amount,
          created_at: e.createdAt,
          idempotency_key: e.idempotencyKey,
        })),
        { onConflict: "idempotency_key", ignoreDuplicates: true },
      ),
      "insert xp",
    );
  }
  async listBadges(): Promise<Badge[]> {
    return BADGES;
  }
  async listUserBadges(userId?: string): Promise<UserBadge[]> {
    const db = await this.user();
    let q = db.from("user_badges").select("*");
    if (userId) q = q.eq("user_id", userId);
    return must(await q, "badges").map((r: Row) => ({ userId: r.user_id, badgeCode: r.badge_code, awardedAt: r.awarded_at, raceId: r.race_id }));
  }
  async insertUserBadges(badges: UserBadge[]): Promise<void> {
    if (!badges.length) return;
    const db = this.service();
    must(
      await db.from("user_badges").upsert(
        badges.map((b) => ({ user_id: b.userId, badge_code: b.badgeCode, awarded_at: b.awardedAt, race_id: b.raceId })),
        { onConflict: "user_id,badge_code", ignoreDuplicates: true },
      ),
      "insert badges",
    );
  }

  async listProfiles(): Promise<Profile[]> {
    const db = await this.user();
    return must(await db.from("profiles").select("*"), "profiles").map(mapProfile);
  }
  async getProfile(id: string): Promise<Profile | null> {
    const db = await this.user();
    const { data } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
    return data ? mapProfile(data) : null;
  }
  async getProfileByUsername(username: string): Promise<Profile | null> {
    const db = await this.user();
    const { data } = await db.from("profiles").select("*").ilike("username", username).maybeSingle();
    return data ? mapProfile(data) : null;
  }
  async upsertProfile(profile: Profile): Promise<Profile> {
    const db = await this.user();
    const data = must(
      await db
        .from("profiles")
        .upsert({
          id: profile.id,
          username: profile.username,
          display_name: profile.displayName,
          avatar_seed: profile.avatarSeed,
          bio: profile.bio,
          is_demo: profile.isDemo,
        })
        .select("*")
        .single(),
      "upsert profile",
    );
    return mapProfile(data);
  }
  async updateProfile(id: string, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarSeed">>): Promise<Profile> {
    const db = await this.user();
    const row: Row = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.avatarSeed !== undefined) row.avatar_seed = patch.avatarSeed;
    return mapProfile(must(await db.from("profiles").update(row).eq("id", id).select("*").single(), "update profile"));
  }

  async listAuditLog(limit = 50): Promise<AuditLogEntry[]> {
    const db = this.service();
    return must(await db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limit), "audit").map(
      (r: Row) => ({
        id: r.id,
        actorId: r.actor_id,
        actorLabel: r.actor_label,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        details: r.details ?? {},
        createdAt: r.created_at,
      }),
    );
  }
  async appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void> {
    const db = this.service();
    must(
      await db.from("admin_audit_log").insert({
        actor_id: entry.actorId,
        actor_label: entry.actorLabel,
        action: entry.action,
        target_type: entry.targetType,
        target_id: entry.targetId,
        details: entry.details,
      }),
      "audit",
    );
  }
}

import { AI_PROFILES } from "@/lib/scoring/ai";
import { BADGES } from "@/lib/scoring/badges";
import { RACE_FORMULA_VERSION } from "@/lib/scoring/race-score";
import { isBeforeDeadline, validatePicks } from "@/lib/scoring/validation";
import type {
  AiProfile,
  AuditLogEntry,
  Badge,
  ConstituentVersion,
  Lineup,
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

export interface DemoState {
  narratives: Narrative[];
  versions: ConstituentVersion[];
  races: Race[];
  snapshots: NarrativeSnapshot[];
  lineups: Lineup[];
  results: RaceResult[];
  xp: XpEntry[];
  userBadges: UserBadge[];
  profiles: Profile[];
  audit: AuditLogEntry[];
}

export function emptyState(): DemoState {
  return {
    narratives: [],
    versions: [],
    races: [],
    snapshots: [],
    lineups: [],
    results: [],
    xp: [],
    userBadges: [],
    profiles: [],
    audit: [],
  };
}

/**
 * In-memory store used by Demo Mode and by unit tests. All mutations enforce
 * the same invariants the database enforces (unique lineup per user per race,
 * three unique picks, 100 Energy, deadline, immutability).
 */
export class DemoStore implements DataStore {
  readonly kind = "demo" as const;
  private raceCounter = 0;

  constructor(
    public state: DemoState = emptyState(),
    private makeId: (prefix: string) => string,
    private clock: () => string = () => new Date().toISOString(),
  ) {}

  setClock(clock: () => string): void {
    this.clock = clock;
  }

  async listNarratives(): Promise<Narrative[]> {
    return [...this.state.narratives];
  }
  async getNarrativeBySlug(slug: string): Promise<Narrative | null> {
    return this.state.narratives.find((n) => n.slug === slug) ?? null;
  }
  async getConstituentVersion(id: string): Promise<ConstituentVersion | null> {
    return this.state.versions.find((v) => v.id === id) ?? null;
  }
  async listConstituentVersions(narrativeId: string): Promise<ConstituentVersion[]> {
    return this.state.versions.filter((v) => v.narrativeId === narrativeId).sort((a, b) => a.version - b.version);
  }
  async updateNarrative(id: string, patch: Partial<Pick<Narrative, "name" | "description" | "active" | "accentColor">>, actor: AdminActor): Promise<Narrative> {
    const n = this.state.narratives.find((x) => x.id === id);
    if (!n) throw new StoreError("Narrative not found", "not_found");
    Object.assign(n, patch);
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "narrative.update", targetType: "narrative", targetId: id, details: patch });
    return n;
  }
  async createConstituentVersion(narrativeId: string, constituents: ConstituentVersion["constituents"], note: string, actor: AdminActor): Promise<ConstituentVersion> {
    const n = this.state.narratives.find((x) => x.id === narrativeId);
    if (!n) throw new StoreError("Narrative not found", "not_found");
    const live = this.state.races.some((r) => r.status === "live");
    if (live) throw new StoreError("Constituents cannot change while a Race is live", "state");
    const versions = await this.listConstituentVersions(narrativeId);
    const version: ConstituentVersion = {
      id: this.makeId("ncv"),
      narrativeId,
      version: (versions[versions.length - 1]?.version ?? 0) + 1,
      createdAt: this.clock(),
      note,
      constituents,
    };
    this.state.versions.push(version);
    n.currentConstituentVersionId = version.id;
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "narrative.constituents", targetType: "narrative", targetId: narrativeId, details: { version: version.version, note } });
    return version;
  }

  async listRaces(opts?: { includeDrafts?: boolean }): Promise<Race[]> {
    return this.state.races
      .filter((r) => opts?.includeDrafts || r.status !== "draft")
      .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  }
  async getRace(id: string): Promise<Race | null> {
    return this.state.races.find((r) => r.id === id) ?? null;
  }
  async createRace(input: CreateRaceInput, actor: AdminActor): Promise<Race> {
    if (!(Date.parse(input.locksAt) <= Date.parse(input.startsAt) && Date.parse(input.startsAt) < Date.parse(input.endsAt))) {
      throw new StoreError("Race times must satisfy locksAt <= startsAt < endsAt", "invalid");
    }
    this.raceCounter = Math.max(this.raceCounter, ...this.state.races.map((r) => r.number)) + 1;
    const race: Race = {
      id: this.makeId("race"),
      number: this.raceCounter,
      name: input.name,
      status: "draft",
      publishedAt: null,
      locksAt: input.locksAt,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      settledAt: null,
      voidReason: null,
      formulaVersion: RACE_FORMULA_VERSION,
      featured: input.featured ?? false,
      isDemo: true,
    };
    this.state.races.push(race);
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "race.create", targetType: "race", targetId: race.id, details: { name: race.name } });
    return race;
  }
  async setRaceStatus(id: string, status: RaceStatus, actor: AdminActor, details: Record<string, unknown> = {}): Promise<Race> {
    const race = this.state.races.find((r) => r.id === id);
    if (!race) throw new StoreError("Race not found", "not_found");
    const from = race.status;
    race.status = status;
    if (status === "published" && !race.publishedAt) race.publishedAt = this.clock();
    if (status === "settled") race.settledAt = this.clock();
    if (status === "void") race.voidReason = String(details.reason ?? "Voided by admin");
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: `race.${status}`, targetType: "race", targetId: id, details: { from, ...details } });
    return race;
  }
  async setRaceFeatured(id: string, featured: boolean, actor: AdminActor): Promise<Race> {
    const race = this.state.races.find((r) => r.id === id);
    if (!race) throw new StoreError("Race not found", "not_found");
    race.featured = featured;
    await this.appendAudit({ actorId: actor.id, actorLabel: actor.label, action: "race.featured", targetType: "race", targetId: id, details: { featured } });
    return race;
  }

  async listSnapshots(raceId: string): Promise<NarrativeSnapshot[]> {
    return this.state.snapshots.filter((s) => s.raceId === raceId);
  }
  async insertSnapshots(snapshots: NarrativeSnapshot[]): Promise<void> {
    this.state.snapshots.push(...snapshots);
  }

  async listLineups(raceId: string): Promise<Lineup[]> {
    return this.state.lineups.filter((l) => l.raceId === raceId);
  }
  async listLineupsForUser(userId: string): Promise<Lineup[]> {
    return this.state.lineups.filter((l) => l.userId === userId);
  }
  async getLineup(id: string): Promise<Lineup | null> {
    return this.state.lineups.find((l) => l.id === id) ?? null;
  }
  async getUserLineup(raceId: string, userId: string): Promise<Lineup | null> {
    return this.state.lineups.find((l) => l.raceId === raceId && l.userId === userId) ?? null;
  }
  async createLineup(input: CreateLineupInput, nowIso: string): Promise<Lineup> {
    const race = await this.getRace(input.raceId);
    if (!race) throw new StoreError("Race not found", "not_found");
    if (race.status !== "published") throw new StoreError("This Race is not accepting lineups", "state");
    if (!isBeforeDeadline(nowIso, race.locksAt)) throw new StoreError("The lock deadline has passed", "deadline_passed");
    const problems = validatePicks(input.picks);
    if (problems.length) throw new StoreError(problems.join(" "), "invalid");
    const narrativeIds = new Set(this.state.narratives.filter((n) => n.active).map((n) => n.id));
    if (!input.picks.every((p) => narrativeIds.has(p.narrativeId))) throw new StoreError("Unknown narrative", "invalid");
    if (await this.getUserLineup(input.raceId, input.userId)) {
      throw new StoreError("You already locked a lineup for this Race", "duplicate");
    }
    const lineup: Lineup = {
      id: this.makeId("lnp"),
      raceId: input.raceId,
      kind: "human",
      userId: input.userId,
      aiProfileId: null,
      thesis: input.thesis?.trim() || null,
      createdAt: nowIso,
      lockedAt: nowIso,
      status: "locked",
      picks: input.picks.map((p) => ({ ...p })),
      isGuest: input.isGuest ?? false,
    };
    this.state.lineups.push(lineup);
    return lineup;
  }
  async insertAiLineups(lineups: Lineup[]): Promise<void> {
    for (const l of lineups) {
      const problems = validatePicks(l.picks);
      if (problems.length) throw new StoreError(problems.join(" "), "invalid");
      if (this.state.lineups.some((x) => x.raceId === l.raceId && x.aiProfileId === l.aiProfileId)) {
        throw new StoreError("AI lineup already exists", "duplicate");
      }
    }
    this.state.lineups.push(...lineups);
  }
  async updateLineupStatus(raceId: string, status: Lineup["status"]): Promise<void> {
    for (const l of this.state.lineups) if (l.raceId === raceId) l.status = status;
  }

  async listAiProfiles(): Promise<AiProfile[]> {
    return AI_PROFILES;
  }

  async listResults(raceId: string): Promise<RaceResult[]> {
    return this.state.results.filter((r) => r.raceId === raceId).sort((a, b) => a.rank - b.rank);
  }
  async listResultsForUser(userId: string): Promise<RaceResult[]> {
    return this.state.results.filter((r) => r.userId === userId);
  }
  async listAllResults(): Promise<RaceResult[]> {
    return [...this.state.results];
  }
  async insertResults(results: RaceResult[]): Promise<void> {
    for (const r of results) {
      if (this.state.results.some((x) => x.lineupId === r.lineupId)) {
        throw new StoreError("Duplicate result for lineup", "duplicate");
      }
    }
    this.state.results.push(...results);
  }
  async listXp(userId?: string): Promise<XpEntry[]> {
    return userId ? this.state.xp.filter((e) => e.userId === userId) : [...this.state.xp];
  }
  async insertXp(entries: XpEntry[]): Promise<void> {
    const keys = new Set(this.state.xp.map((e) => e.idempotencyKey));
    for (const e of entries) {
      if (keys.has(e.idempotencyKey)) continue; // idempotent
      keys.add(e.idempotencyKey);
      this.state.xp.push(e);
    }
  }
  async listBadges(): Promise<Badge[]> {
    return BADGES;
  }
  async listUserBadges(userId?: string): Promise<UserBadge[]> {
    return userId ? this.state.userBadges.filter((b) => b.userId === userId) : [...this.state.userBadges];
  }
  async insertUserBadges(badges: UserBadge[]): Promise<void> {
    for (const b of badges) {
      if (this.state.userBadges.some((x) => x.userId === b.userId && x.badgeCode === b.badgeCode)) continue;
      this.state.userBadges.push(b);
    }
  }

  async listProfiles(): Promise<Profile[]> {
    return [...this.state.profiles];
  }
  async getProfile(id: string): Promise<Profile | null> {
    return this.state.profiles.find((p) => p.id === id) ?? null;
  }
  async getProfileByUsername(username: string): Promise<Profile | null> {
    return this.state.profiles.find((p) => p.username.toLowerCase() === username.toLowerCase()) ?? null;
  }
  async upsertProfile(profile: Profile): Promise<Profile> {
    const idx = this.state.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) this.state.profiles[idx] = profile;
    else this.state.profiles.push(profile);
    return profile;
  }
  async updateProfile(id: string, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarSeed">>): Promise<Profile> {
    const p = this.state.profiles.find((x) => x.id === id);
    if (!p) throw new StoreError("Profile not found", "not_found");
    Object.assign(p, patch);
    return p;
  }

  async listAuditLog(limit = 50): Promise<AuditLogEntry[]> {
    return [...this.state.audit].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
  }
  async appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void> {
    this.state.audit.push({ ...entry, id: this.makeId("aud"), createdAt: this.clock() });
  }
}

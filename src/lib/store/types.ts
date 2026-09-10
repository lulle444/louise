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

export interface CreateLineupInput {
  raceId: string;
  userId: string;
  picks: LineupPick[];
  thesis: string | null;
  /** True when the viewer is a Demo Mode guest (cookie-backed). */
  isGuest?: boolean;
}

export interface CreateRaceInput {
  name: string;
  locksAt: string;
  startsAt: string;
  endsAt: string;
  featured?: boolean;
}

export interface AdminActor {
  id: string;
  label: string;
}

export class StoreError extends Error {
  constructor(
    message: string,
    public code:
      | "not_found"
      | "deadline_passed"
      | "duplicate"
      | "invalid"
      | "forbidden"
      | "state",
  ) {
    super(message);
  }
}

/**
 * The persistence boundary. Implemented by the deterministic Demo store and by
 * the Supabase store. Services and pages depend only on this interface.
 */
export interface DataStore {
  readonly kind: "demo" | "supabase";

  // Catalogue
  listNarratives(): Promise<Narrative[]>;
  getNarrativeBySlug(slug: string): Promise<Narrative | null>;
  getConstituentVersion(id: string): Promise<ConstituentVersion | null>;
  listConstituentVersions(narrativeId: string): Promise<ConstituentVersion[]>;
  updateNarrative(id: string, patch: Partial<Pick<Narrative, "name" | "description" | "active" | "accentColor">>, actor: AdminActor): Promise<Narrative>;
  createConstituentVersion(narrativeId: string, constituents: ConstituentVersion["constituents"], note: string, actor: AdminActor): Promise<ConstituentVersion>;

  // Races
  listRaces(opts?: { includeDrafts?: boolean }): Promise<Race[]>;
  getRace(id: string): Promise<Race | null>;
  createRace(input: CreateRaceInput, actor: AdminActor): Promise<Race>;
  setRaceStatus(id: string, status: RaceStatus, actor: AdminActor, details?: Record<string, unknown>): Promise<Race>;
  setRaceFeatured(id: string, featured: boolean, actor: AdminActor): Promise<Race>;

  // Snapshots
  listSnapshots(raceId: string): Promise<NarrativeSnapshot[]>;
  insertSnapshots(snapshots: NarrativeSnapshot[]): Promise<void>;

  // Lineups
  listLineups(raceId: string): Promise<Lineup[]>;
  listLineupsForUser(userId: string): Promise<Lineup[]>;
  getLineup(id: string): Promise<Lineup | null>;
  getUserLineup(raceId: string, userId: string): Promise<Lineup | null>;
  createLineup(input: CreateLineupInput, nowIso: string): Promise<Lineup>;
  insertAiLineups(lineups: Lineup[]): Promise<void>;
  updateLineupStatus(raceId: string, status: Lineup["status"]): Promise<void>;

  // AI
  listAiProfiles(): Promise<AiProfile[]>;

  // Results & rewards
  listResults(raceId: string): Promise<RaceResult[]>;
  listResultsForUser(userId: string): Promise<RaceResult[]>;
  listAllResults(): Promise<RaceResult[]>;
  insertResults(results: RaceResult[]): Promise<void>;
  listXp(userId?: string): Promise<XpEntry[]>;
  insertXp(entries: XpEntry[]): Promise<void>;
  listBadges(): Promise<Badge[]>;
  listUserBadges(userId?: string): Promise<UserBadge[]>;
  insertUserBadges(badges: UserBadge[]): Promise<void>;

  // Profiles
  listProfiles(): Promise<Profile[]>;
  getProfile(id: string): Promise<Profile | null>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  upsertProfile(profile: Profile): Promise<Profile>;
  updateProfile(id: string, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarSeed">>): Promise<Profile>;

  // Audit
  listAuditLog(limit?: number): Promise<AuditLogEntry[]>;
  appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void>;
}

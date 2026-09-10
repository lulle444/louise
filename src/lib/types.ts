/**
 * Core domain types for MEGASPRINT.
 *
 * Everything here is deliberately plain data so that the same shapes can be
 * produced by the deterministic Demo store and by the Supabase store.
 */

export type NarrativeSlug =
  | "ai"
  | "rwa"
  | "gaming"
  | "defi"
  | "depin"
  | "layer2"
  | "privacy"
  | "socialfi"
  | "memecoins";

export type RaceStatus =
  | "draft"
  | "published" // open for lineups; lock deadline in the future
  | "live" // lineups locked, standings updating
  | "settled"
  | "void"
  | "archived";

export type PickRole = "leader" | "challenger" | "wildcard";
export const PICK_ROLES: PickRole[] = ["leader", "challenger", "wildcard"];

export type LineupKind = "human" | "ai";
export type LineupStatus = "locked" | "settled" | "void";
export type SnapshotKind = "reference" | "prelock" | "interval" | "final";
export type DataQuality = "ok" | "unavailable";

export interface Narrative {
  id: string;
  slug: NarrativeSlug;
  name: string;
  shortName: string;
  description: string;
  icon: string; // lucide icon name
  accentColor: string;
  active: boolean;
  currentConstituentVersionId: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
}

export interface Constituent {
  assetId: string;
  symbol: string;
  name: string;
  weight: number; // 0..1, sums to 1 within a version
}

export interface ConstituentVersion {
  id: string;
  narrativeId: string;
  version: number;
  createdAt: string;
  note: string;
  constituents: Constituent[];
}

export interface Race {
  id: string;
  number: number;
  name: string;
  status: RaceStatus;
  publishedAt: string | null;
  locksAt: string; // lineups must be locked before this
  startsAt: string; // scoring window begins
  endsAt: string; // scoring window ends
  settledAt: string | null;
  voidReason: string | null;
  formulaVersion: string;
  featured: boolean;
  isDemo: boolean;
}

export interface SnapshotComponents {
  price: number;
  breadth: number;
  volume: number;
  momentum: number;
}

export interface SnapshotRaw {
  priceChangePct: number;
  breadthShare: number; // 0..1
  volumeChangePct: number;
  momentumConsistency: number; // 0..1
}

export interface NarrativeSnapshot {
  id: string;
  raceId: string;
  narrativeId: string;
  kind: SnapshotKind;
  takenAt: string;
  raw: SnapshotRaw;
  normalized: SnapshotComponents;
  score: number;
  rank: number;
  source: string;
  constituentVersionId: string;
  formulaVersion: string;
  quality: DataQuality;
}

export interface LineupPick {
  role: PickRole;
  narrativeId: string;
  energy: number;
}

export interface Lineup {
  id: string;
  raceId: string;
  kind: LineupKind;
  userId: string | null;
  aiProfileId: string | null;
  thesis: string | null;
  createdAt: string;
  lockedAt: string;
  status: LineupStatus;
  picks: LineupPick[];
  strategyVersion?: string | null;
  inputSnapshotId?: string | null;
  isGuest?: boolean;
}

export type AiCode = "ROTATOR" | "ATLAS" | "NOVA";

export interface AiProfile {
  id: string;
  code: AiCode;
  name: string;
  tagline: string;
  description: string;
  strategyVersion: string;
  accentColor: string;
}

export interface RaceResult {
  id: string;
  raceId: string;
  lineupId: string;
  userId: string | null;
  aiProfileId: string | null;
  raceScore: number;
  leaderPoints: number;
  challengerPoints: number;
  wildcardPoints: number;
  leaderFinish: number;
  challengerFinish: number;
  wildcardFinish: number;
  wildcardStart: number;
  leaderHit: boolean;
  challengerHit: boolean;
  wildcardHit: boolean;
  bestRole: PickRole | null;
  xpAwarded: number;
  rank: number;
  settledAt: string;
  formulaVersion: string;
}

export type XpReason =
  | "lineup_locked"
  | "leader_correct"
  | "challenger_podium"
  | "wildcard_success"
  | "participation_streak"
  | "leader_streak";

export interface XpEntry {
  id: string;
  userId: string;
  raceId: string | null;
  reason: XpReason;
  amount: number;
  createdAt: string;
  idempotencyKey: string;
}

export type BadgeCode =
  | "first_lineup"
  | "winner_called"
  | "wildcard_master"
  | "perfect_podium"
  | "beat_the_ai"
  | "crowd_breaker"
  | "ai_specialist"
  | "rwa_specialist"
  | "gaming_specialist"
  | "three_race_streak";

export interface Badge {
  code: BadgeCode;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadge {
  userId: string;
  badgeCode: BadgeCode;
  awardedAt: string;
  raceId: string | null;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  bio: string | null;
  createdAt: string;
  isDemo: boolean;
  isGuest?: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface LevelDef {
  name: string;
  minXp: number;
}

export interface MetaDNA {
  ready: boolean;
  sampleSize: number;
  label:
    | "Early Hunter"
    | "Rotation Reader"
    | "Wildcard Scout"
    | "Consensus Navigator"
    | "Contrarian"
    | "Balanced Strategist"
    | null;
  bestNarrativeId: string | null;
  favoriteNarrativeId: string | null;
  bestRole: PickRole | null;
  earlyDiscovery: number; // 0..100
  convictionCalibration: number; // 0..100
  consensusTendency: number; // 0..100 (100 = fully consensus, 0 = contrarian)
  averageScore: number;
  axes: { key: string; label: string; value: number }[];
}

export interface CrowdPicks {
  sampleSize: number;
  byRole: Record<
    PickRole,
    { narrativeId: string; count: number; share: number; energy: number }[]
  >;
  conviction: { narrativeId: string; energyShare: number; energyTotal: number }[];
  consensus: LineupPick[] | null;
  disagreement: {
    role: PickRole;
    top: { narrativeId: string; share: number };
    second: { narrativeId: string; share: number };
  } | null;
}

export interface Viewer {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  isAdmin: boolean;
  isGuest: boolean;
}

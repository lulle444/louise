import { scoreLineup } from "@/lib/scoring/race-score";
import { applyAwards, lockXp, xpForSettlement } from "@/lib/scoring/xp";
import { isBeforeDeadline, validatePicks } from "@/lib/scoring/validation";
import { finalStandings } from "@/lib/services/settlement";
import { snapshotOfKind } from "@/lib/services/snapshots";
import type { Lineup, Profile, RaceResult, UserBadge, XpEntry } from "@/lib/types";
import { StoreError, type CreateLineupInput, type DataStore } from "./types";

export interface GuestState {
  id: string;
  username: string;
  displayName: string;
  admin: boolean;
  createdAt: string;
  lineups: Lineup[];
}

/**
 * Demo Mode guests live in a browser cookie rather than the shared store.
 * This overlay merges the guest's lineups, derived results and XP into every
 * read so the rest of the app can treat guests like any other player.
 * Results are derived with the same pure scoring function used at settlement,
 * which keeps them idempotent by construction.
 */
export class GuestOverlayStore implements DataStore {
  readonly kind: DataStore["kind"];

  constructor(
    private base: DataStore,
    public guest: GuestState,
  ) {
    this.kind = base.kind;
  }

  private guestLineups(raceId?: string): Lineup[] {
    return this.guest.lineups
      .filter((l) => !raceId || l.raceId === raceId)
      .map((l) => ({ ...l, isGuest: true }));
  }

  private guestProfile(): Profile {
    return {
      id: this.guest.id,
      username: this.guest.username,
      displayName: this.guest.displayName,
      avatarSeed: this.guest.id,
      bio: "Demo guest session. Lineups are stored in this browser only.",
      createdAt: this.guest.createdAt,
      isDemo: true,
      isGuest: true,
    };
  }

  /** Results derived for guest lineups that have no stored result (e.g. settled by the demo admin in this same session). */
  private async deriveResults(raceId?: string): Promise<RaceResult[]> {
    const out: RaceResult[] = [];
    const stored = new Set((await this.base.listResultsForUser(this.guest.id)).map((r) => r.lineupId));
    for (const lineup of this.guestLineups(raceId)) {
      if (stored.has(lineup.id)) continue;
      const race = await this.base.getRace(lineup.raceId);
      if (!race || race.status !== "settled") continue;
      const snapshots = await this.base.listSnapshots(race.id);
      const standings = finalStandings(snapshotOfKind(snapshots, "prelock"), snapshotOfKind(snapshots, "final"));
      if (!standings.length) continue;
      const b = scoreLineup(lineup.picks, standings);
      const others = await this.base.listResults(race.id);
      const rank = others.filter((r) => r.raceScore > b.raceScore).length + 1;
      const awards = xpForSettlement(this.guest.id, race.id, b, { priorParticipationStreak: 0, priorLeaderStreak: 0 });
      out.push({
        id: `res_${lineup.id}`,
        raceId: race.id,
        lineupId: lineup.id,
        userId: this.guest.id,
        aiProfileId: null,
        raceScore: b.raceScore,
        leaderPoints: b.leaderPoints,
        challengerPoints: b.challengerPoints,
        wildcardPoints: b.wildcardPoints,
        leaderFinish: b.leaderFinish,
        challengerFinish: b.challengerFinish,
        wildcardFinish: b.wildcardFinish,
        wildcardStart: b.wildcardStart,
        leaderHit: b.leaderHit,
        challengerHit: b.challengerHit,
        wildcardHit: b.wildcardHit,
        bestRole: b.bestRole,
        xpAwarded: awards.reduce((s, a) => s + a.amount, 0),
        rank,
        settledAt: race.settledAt ?? race.endsAt,
        formulaVersion: b.formulaVersion,
      });
    }
    return out;
  }

  // --- pass-through ---
  listNarratives = () => this.base.listNarratives();
  getNarrativeBySlug = (slug: string) => this.base.getNarrativeBySlug(slug);
  getConstituentVersion = (id: string) => this.base.getConstituentVersion(id);
  listConstituentVersions = (id: string) => this.base.listConstituentVersions(id);
  updateNarrative: DataStore["updateNarrative"] = (...a) => this.base.updateNarrative(...a);
  createConstituentVersion: DataStore["createConstituentVersion"] = (...a) => this.base.createConstituentVersion(...a);
  listRaces: DataStore["listRaces"] = (o) => this.base.listRaces(o);
  getRace = (id: string) => this.base.getRace(id);
  createRace: DataStore["createRace"] = (...a) => this.base.createRace(...a);
  setRaceStatus: DataStore["setRaceStatus"] = (...a) => this.base.setRaceStatus(...a);
  setRaceFeatured: DataStore["setRaceFeatured"] = (...a) => this.base.setRaceFeatured(...a);
  listSnapshots = (raceId: string) => this.base.listSnapshots(raceId);
  insertSnapshots: DataStore["insertSnapshots"] = (s) => this.base.insertSnapshots(s);
  insertAiLineups: DataStore["insertAiLineups"] = (l) => this.base.insertAiLineups(l);
  updateLineupStatus: DataStore["updateLineupStatus"] = (r, s) => this.base.updateLineupStatus(r, s);
  listAiProfiles = () => this.base.listAiProfiles();
  insertResults: DataStore["insertResults"] = (r) => this.base.insertResults(r);
  insertXp: DataStore["insertXp"] = (e) => this.base.insertXp(e);
  listBadges = () => this.base.listBadges();
  insertUserBadges: DataStore["insertUserBadges"] = (b) => this.base.insertUserBadges(b);
  upsertProfile: DataStore["upsertProfile"] = (p) => this.base.upsertProfile(p);
  listAuditLog: DataStore["listAuditLog"] = (l) => this.base.listAuditLog(l);
  appendAudit: DataStore["appendAudit"] = (e) => this.base.appendAudit(e);

  async updateProfile(id: string, patch: Partial<Pick<Profile, "displayName" | "bio" | "avatarSeed">>): Promise<Profile> {
    if (id === this.guest.id) {
      if (patch.displayName) this.guest.displayName = patch.displayName;
      return this.guestProfile();
    }
    return this.base.updateProfile(id, patch);
  }

  // --- overlays ---
  async listLineups(raceId: string): Promise<Lineup[]> {
    return [...(await this.base.listLineups(raceId)), ...this.guestLineups(raceId)];
  }
  async listLineupsForUser(userId: string): Promise<Lineup[]> {
    if (userId === this.guest.id) return this.guestLineups();
    return this.base.listLineupsForUser(userId);
  }
  async getLineup(id: string): Promise<Lineup | null> {
    return this.guestLineups().find((l) => l.id === id) ?? this.base.getLineup(id);
  }
  async getUserLineup(raceId: string, userId: string): Promise<Lineup | null> {
    if (userId === this.guest.id) return this.guestLineups(raceId)[0] ?? null;
    return this.base.getUserLineup(raceId, userId);
  }
  async createLineup(input: CreateLineupInput, nowIso: string): Promise<Lineup> {
    if (input.userId !== this.guest.id) return this.base.createLineup(input, nowIso);
    const race = await this.base.getRace(input.raceId);
    if (!race) throw new StoreError("Race not found", "not_found");
    if (race.status !== "published") throw new StoreError("This Race is not accepting lineups", "state");
    if (!isBeforeDeadline(nowIso, race.locksAt)) throw new StoreError("The lock deadline has passed", "deadline_passed");
    const problems = validatePicks(input.picks);
    if (problems.length) throw new StoreError(problems.join(" "), "invalid");
    const active = new Set((await this.base.listNarratives()).filter((n) => n.active).map((n) => n.id));
    if (!input.picks.every((p) => active.has(p.narrativeId))) throw new StoreError("Unknown narrative", "invalid");
    if (this.guest.lineups.some((l) => l.raceId === input.raceId)) {
      throw new StoreError("You already locked a lineup for this Race", "duplicate");
    }
    const lineup: Lineup = {
      id: `lnp_g${this.guest.id.slice(-6)}${race.number}`,
      raceId: input.raceId,
      kind: "human",
      userId: this.guest.id,
      aiProfileId: null,
      thesis: input.thesis?.trim() || null,
      createdAt: nowIso,
      lockedAt: nowIso,
      status: "locked",
      picks: input.picks.map((p) => ({ ...p })),
      isGuest: true,
    };
    this.guest.lineups.push(lineup);
    return lineup;
  }

  async listResults(raceId: string): Promise<RaceResult[]> {
    const base = await this.base.listResults(raceId);
    const mine = await this.deriveResults(raceId);
    return [...base, ...mine].sort((a, b) => a.rank - b.rank || b.raceScore - a.raceScore);
  }
  async listResultsForUser(userId: string): Promise<RaceResult[]> {
    if (userId === this.guest.id) return [...(await this.base.listResultsForUser(userId)), ...(await this.deriveResults())];
    return this.base.listResultsForUser(userId);
  }
  async listAllResults(): Promise<RaceResult[]> {
    return [...(await this.base.listAllResults()), ...(await this.deriveResults())];
  }
  async listXp(userId?: string): Promise<XpEntry[]> {
    if (userId && userId !== this.guest.id) return this.base.listXp(userId);
    const baseMine = await this.base.listXp(this.guest.id);
    const ledger: XpEntry[] = [...baseMine];
    let n = 0;
    const mk = () => `xp_g${++n}`;
    for (const l of this.guestLineups()) {
      applyAwards(ledger, this.guest.id, l.raceId, [lockXp(this.guest.id, l.raceId)], l.lockedAt, mk);
    }
    for (const r of await this.deriveResults()) {
      const awards = xpForSettlement(this.guest.id, r.raceId, r, { priorParticipationStreak: 0, priorLeaderStreak: 0 });
      applyAwards(ledger, this.guest.id, r.raceId, awards, r.settledAt, mk);
    }
    if (userId) return ledger;
    const baseKeys = new Set(baseMine.map((e) => e.idempotencyKey));
    return [...(await this.base.listXp()), ...ledger.filter((e) => !baseKeys.has(e.idempotencyKey))];
  }
  async listUserBadges(userId?: string): Promise<UserBadge[]> {
    if (userId && userId !== this.guest.id) return this.base.listUserBadges(userId);
    const mine: UserBadge[] = [...(await this.base.listUserBadges(this.guest.id))];
    const lineups = this.guestLineups();
    if (lineups.length && !mine.some((b) => b.badgeCode === "first_lineup")) mine.push({ userId: this.guest.id, badgeCode: "first_lineup", awardedAt: lineups[0].lockedAt, raceId: lineups[0].raceId });
    for (const r of await this.deriveResults()) {
      if (r.leaderHit && !mine.some((b) => b.badgeCode === "winner_called")) mine.push({ userId: this.guest.id, badgeCode: "winner_called", awardedAt: r.settledAt, raceId: r.raceId });
      if (r.wildcardStart - r.wildcardFinish >= 4 && !mine.some((b) => b.badgeCode === "wildcard_master")) mine.push({ userId: this.guest.id, badgeCode: "wildcard_master", awardedAt: r.settledAt, raceId: r.raceId });
      if (r.leaderHit && r.challengerHit && r.wildcardHit && !mine.some((b) => b.badgeCode === "perfect_podium")) mine.push({ userId: this.guest.id, badgeCode: "perfect_podium", awardedAt: r.settledAt, raceId: r.raceId });
    }
    if (userId) return mine;
    const stored = new Set((await this.base.listUserBadges(this.guest.id)).map((b) => b.badgeCode));
    return [...(await this.base.listUserBadges()), ...mine.filter((b) => !stored.has(b.badgeCode))];
  }
  async listProfiles(): Promise<Profile[]> {
    return [...(await this.base.listProfiles()), this.guestProfile()];
  }
  async getProfile(id: string): Promise<Profile | null> {
    if (id === this.guest.id) return this.guestProfile();
    return this.base.getProfile(id);
  }
  async getProfileByUsername(username: string): Promise<Profile | null> {
    if (username.toLowerCase() === this.guest.username.toLowerCase()) return this.guestProfile();
    return this.base.getProfileByUsername(username);
  }
}

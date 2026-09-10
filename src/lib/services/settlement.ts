import { evaluateBadges } from "@/lib/scoring/badges";
import { aggregateCrowd } from "@/lib/scoring/crowd";
import { scoreLineup, type FinalStanding } from "@/lib/scoring/race-score";
import { applyAwards, xpForSettlement } from "@/lib/scoring/xp";
import type { AdminActor, DataStore } from "@/lib/store/types";
import type { NarrativeSnapshot, Race, RaceResult, UserBadge, XpEntry } from "@/lib/types";
import { snapshotOfKind } from "./snapshots";

export function finalStandings(prelock: NarrativeSnapshot[], final: NarrativeSnapshot[]): FinalStanding[] {
  const start = new Map(prelock.map((s) => [s.narrativeId, s.rank]));
  return final.map((s) => ({
    narrativeId: s.narrativeId,
    finishRank: s.rank,
    startRank: start.get(s.narrativeId) ?? s.rank,
  }));
}

/** Ordered ids of settled races (by start time ascending) up to and including `race`. */
async function settledRaceOrder(store: DataStore, race: Race): Promise<string[]> {
  const races = await store.listRaces({ includeDrafts: true });
  return races
    .filter((r) => (r.status === "settled" || r.id === race.id) && Date.parse(r.startsAt) <= Date.parse(race.startsAt))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((r) => r.id);
}

export interface SettlementOutcome {
  race: Race;
  results: RaceResult[];
  xpAdded: XpEntry[];
  badgesAdded: UserBadge[];
  alreadySettled: boolean;
}

/**
 * Settle a Race. Idempotent: a Race that is already settled returns its stored
 * results and awards nothing new. XP awards are keyed so re-runs never double
 * count even if results were partially written.
 */
export async function settleRace(
  store: DataStore,
  raceId: string,
  actor: AdminActor,
  nowIso: string,
  makeId: (prefix: string) => string,
): Promise<SettlementOutcome> {
  const race = await store.getRace(raceId);
  if (!race) throw new Error("Race not found");
  if (race.status === "settled") {
    return { race, results: await store.listResults(raceId), xpAdded: [], badgesAdded: [], alreadySettled: true };
  }
  if (race.status === "void" || race.status === "archived") {
    throw new Error(`Race is ${race.status} and cannot be settled`);
  }

  const snapshots = await store.listSnapshots(raceId);
  const prelock = snapshotOfKind(snapshots, "prelock");
  const final = snapshotOfKind(snapshots, "final");
  if (!final.length) throw new Error("A final snapshot is required before settlement");
  const usable = final.filter((s) => s.quality === "ok");
  if (usable.length < Math.ceil(final.length * 0.6)) {
    throw new Error("Insufficient data quality in the final snapshot — void the Race instead");
  }

  const standings = finalStandings(prelock, final);
  const lineups = (await store.listLineups(raceId)).filter((l) => l.status !== "void");
  const narratives = await store.listNarratives();
  const raceOrder = await settledRaceOrder(store, race);
  const priorOrder = raceOrder.filter((id) => id !== raceId);

  const existingResults = await store.listResults(raceId);
  const existingByLineup = new Map(existingResults.map((r) => [r.lineupId, r]));

  // 1. Score every lineup.
  const scored = lineups.map((l) => {
    const b = scoreLineup(l.picks, standings);
    return { lineup: l, breakdown: b };
  });
  scored.sort((a, b) => b.breakdown.raceScore - a.breakdown.raceScore || a.lineup.lockedAt.localeCompare(b.lineup.lockedAt));

  const results: RaceResult[] = [];
  const allXp = await store.listXp();
  const xpAdded: XpEntry[] = [];
  const allResults = await store.listAllResults();
  const allLineupsByUser = new Map<string, Awaited<ReturnType<typeof store.listLineupsForUser>>>();

  const crowd = aggregateCrowd(lineups);
  const crowdLeaderId = crowd.byRole.leader[0]?.narrativeId ?? null;

  let rank = 0;
  for (const { lineup, breakdown } of scored) {
    rank++;
    const existing = existingByLineup.get(lineup.id);
    let xpAwarded = 0;
    if (lineup.userId) {
      let userLineups = allLineupsByUser.get(lineup.userId);
      if (!userLineups) {
        userLineups = await store.listLineupsForUser(lineup.userId);
        allLineupsByUser.set(lineup.userId, userLineups);
      }
      const userResults = allResults.filter((r) => r.userId === lineup.userId);
      const played = new Set(userLineups.map((l) => l.raceId));
      let participation = 0;
      for (let i = priorOrder.length - 1; i >= 0; i--) {
        if (played.has(priorOrder[i])) participation++;
        else break;
      }
      let leaderStreak = 0;
      for (let i = priorOrder.length - 1; i >= 0; i--) {
        const r = userResults.find((x) => x.raceId === priorOrder[i]);
        if (r?.leaderHit) leaderStreak++;
        else break;
      }
      const awards = xpForSettlement(lineup.userId, raceId, breakdown, {
        priorParticipationStreak: participation,
        priorLeaderStreak: leaderStreak,
      });
      xpAwarded = awards.reduce((s, a) => s + a.amount, 0);
      xpAdded.push(...applyAwards(allXp, lineup.userId, raceId, awards, nowIso, () => makeId("xp")));
    }
    results.push(
      existing ?? {
        id: makeId("res"),
        raceId,
        lineupId: lineup.id,
        userId: lineup.userId,
        aiProfileId: lineup.aiProfileId,
        raceScore: breakdown.raceScore,
        leaderPoints: breakdown.leaderPoints,
        challengerPoints: breakdown.challengerPoints,
        wildcardPoints: breakdown.wildcardPoints,
        leaderFinish: breakdown.leaderFinish,
        challengerFinish: breakdown.challengerFinish,
        wildcardFinish: breakdown.wildcardFinish,
        wildcardStart: breakdown.wildcardStart,
        leaderHit: breakdown.leaderHit,
        challengerHit: breakdown.challengerHit,
        wildcardHit: breakdown.wildcardHit,
        bestRole: breakdown.bestRole,
        xpAwarded,
        rank,
        settledAt: nowIso,
        formulaVersion: breakdown.formulaVersion,
      },
    );
  }

  await store.insertResults(results.filter((r) => !existingByLineup.has(r.lineupId)));
  if (xpAdded.length) await store.insertXp(xpAdded);

  // 2. Badges.
  const badgesAdded: UserBadge[] = [];
  const heldAll = await store.listUserBadges();
  const combinedResults = [...allResults.filter((r) => r.raceId !== raceId), ...results];
  for (const r of results) {
    if (!r.userId) continue;
    const userResults = combinedResults
      .filter((x) => x.userId === r.userId)
      .sort((a, b) => raceOrder.indexOf(a.raceId) - raceOrder.indexOf(b.raceId));
    const userLineups = allLineupsByUser.get(r.userId) ?? [];
    const played = new Set(userLineups.map((l) => l.raceId));
    let participation = 0;
    for (let i = raceOrder.length - 1; i >= 0; i--) {
      if (played.has(raceOrder[i]) || raceOrder[i] === raceId) participation++;
      else break;
    }
    const held = new Set(heldAll.filter((b) => b.userId === r.userId).map((b) => b.badgeCode));
    const earned = evaluateBadges({
      userId: r.userId,
      raceId,
      userResults,
      userLineups: new Map(userLineups.map((l) => [l.id, l])),
      raceResults: results,
      crowdLeaderId,
      participationStreak: participation,
      narratives,
      held,
    });
    for (const code of earned) {
      badgesAdded.push({ userId: r.userId, badgeCode: code, awardedAt: nowIso, raceId });
    }
  }
  if (badgesAdded.length) await store.insertUserBadges(badgesAdded);

  await store.updateLineupStatus(raceId, "settled");
  const settled = await store.setRaceStatus(raceId, "settled", actor, {
    results: results.length,
    xpEntries: xpAdded.length,
    badges: badgesAdded.length,
  });
  return { race: settled, results, xpAdded, badgesAdded, alreadySettled: false };
}

/** Void a Race: lineups are marked void and never affect accuracy or streaks. */
export async function voidRace(store: DataStore, raceId: string, reason: string, actor: AdminActor): Promise<Race> {
  const race = await store.getRace(raceId);
  if (!race) throw new Error("Race not found");
  if (race.status === "settled") throw new Error("A settled Race cannot be voided");
  await store.updateLineupStatus(raceId, "void");
  return store.setRaceStatus(raceId, "void", actor, { reason });
}

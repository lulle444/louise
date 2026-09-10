import { AI_STRATEGY_VERSION, buildAiLineup } from "@/lib/scoring/ai";
import type { DataStore } from "@/lib/store/types";
import type { Lineup, Race } from "@/lib/types";
import { snapshotOfKind } from "./snapshots";

/**
 * Draft and lock the three AI lineups for a Race from the pre-lock snapshot.
 * Refuses to run once the Race has started (no lineups after final data).
 * Idempotent: existing AI lineups are returned unchanged.
 */
export async function lockAiLineups(
  store: DataStore,
  race: Race,
  nowIso: string,
  makeId: (prefix: string) => string,
): Promise<Lineup[]> {
  const existing = (await store.listLineups(race.id)).filter((l) => l.kind === "ai");
  if (existing.length) return existing;
  if (Date.parse(nowIso) > Date.parse(race.startsAt)) {
    throw new Error("AI lineups cannot be generated after the Race has started");
  }
  const snapshots = await store.listSnapshots(race.id);
  const prelock = snapshotOfKind(snapshots, "prelock");
  const reference = snapshotOfKind(snapshots, "reference");
  if (!prelock.length) throw new Error("A pre-lock snapshot is required before AI lineups can be drafted");

  const profiles = await store.listAiProfiles();
  const lineups: Lineup[] = profiles.map((p) => ({
    id: makeId("lnp"),
    raceId: race.id,
    kind: "ai",
    userId: null,
    aiProfileId: p.id,
    thesis: null,
    createdAt: race.locksAt,
    lockedAt: race.locksAt,
    status: "locked",
    picks: buildAiLineup(p.code, prelock, reference.length ? reference : null),
    strategyVersion: AI_STRATEGY_VERSION,
    inputSnapshotId: prelock[0].id,
  }));
  await store.insertAiLineups(lineups);
  return lineups;
}

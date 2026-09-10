import "server-only";
import { getBaseStore, getProvider, newId } from "@/lib/store";
import { lockAiLineups } from "./ai-lineups";
import { settleRace } from "./settlement";
import { takeRaceSnapshot } from "./snapshots";

const SYSTEM = { id: "system_cron", label: "Scheduled job" };

/**
 * Scheduled snapshot pass: for every published Race whose lock time has
 * passed, lock AI lineups and go live; for every live Race take an interval
 * snapshot (or the final snapshot once the window has ended).
 */
export async function runSnapshotJob(nowIso = new Date().toISOString()) {
  const store = await getBaseStore();
  const provider = await getProvider();
  const races = await store.listRaces({ includeDrafts: false });
  const now = Date.parse(nowIso);
  const report: Record<string, string> = {};
  for (const race of races) {
    if (race.status === "published" && now >= Date.parse(race.locksAt)) {
      const snaps = await store.listSnapshots(race.id);
      if (!snaps.some((s) => s.kind === "prelock")) {
        await takeRaceSnapshot(store, provider, race, "reference", race.locksAt, newId);
        await takeRaceSnapshot(store, provider, race, "prelock", race.locksAt, newId);
      }
      await lockAiLineups(store, race, race.locksAt, newId).catch((e: Error) => {
        report[race.id] = `ai lineups: ${e.message}`;
      });
      if (now >= Date.parse(race.startsAt)) {
        await store.setRaceStatus(race.id, "live", SYSTEM);
        report[race.id] = "went live";
      }
    } else if (race.status === "live") {
      const ended = now >= Date.parse(race.endsAt);
      const snaps = await store.listSnapshots(race.id);
      if (ended) {
        if (!snaps.some((s) => s.kind === "final")) {
          await takeRaceSnapshot(store, provider, race, "final", race.endsAt, newId);
          report[race.id] = "final snapshot";
        } else report[race.id] = "awaiting settlement";
      } else {
        await takeRaceSnapshot(store, provider, race, "interval", nowIso, newId);
        report[race.id] = "interval snapshot";
      }
    }
  }
  return report;
}

/** Scheduled settlement pass: settle every live Race whose window has ended. Idempotent. */
export async function runSettleJob(nowIso = new Date().toISOString()) {
  const store = await getBaseStore();
  const provider = await getProvider();
  const races = await store.listRaces();
  const now = Date.parse(nowIso);
  const report: Record<string, string> = {};
  for (const race of races) {
    if (race.status !== "live" || now < Date.parse(race.endsAt)) continue;
    const snaps = await store.listSnapshots(race.id);
    if (!snaps.some((s) => s.kind === "final")) {
      await takeRaceSnapshot(store, provider, race, "final", race.endsAt, newId);
    }
    try {
      const outcome = await settleRace(store, race.id, SYSTEM, nowIso, newId);
      report[race.id] = outcome.alreadySettled ? "already settled" : `settled ${outcome.results.length} lineups`;
    } catch (e) {
      report[race.id] = `error: ${(e as Error).message}`;
    }
  }
  return report;
}

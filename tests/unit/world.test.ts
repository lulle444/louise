import { describe, expect, it } from "vitest";
import { buildDemoWorld, DEMO_ACTOR } from "@/lib/demo/world";
import { settleRace, voidRace } from "@/lib/services/settlement";
import { validatePicks } from "@/lib/scoring/validation";
import { StoreError } from "@/lib/store/types";

const NOW = "2026-09-10T15:00:00.000Z";

describe("demo world", () => {
  it("seeds the full loop deterministically", async () => {
    const world = await buildDemoWorld(NOW);
    const races = await world.store.listRaces();
    expect(races.filter((r) => r.status === "settled")).toHaveLength(4);
    expect(races.filter((r) => r.status === "live")).toHaveLength(1);
    expect(races.filter((r) => r.status === "published")).toHaveLength(1);
    expect((await world.store.listNarratives())).toHaveLength(9);
    expect((await world.store.listProfiles()).length).toBeGreaterThanOrEqual(12);

    const live = (await world.store.getRace(world.liveRaceId))!;
    const snaps = await world.store.listSnapshots(live.id);
    expect(snaps.some((s) => s.kind === "interval")).toBe(true);
    const lineups = await world.store.listLineups(live.id);
    expect(lineups.filter((l) => l.kind === "ai")).toHaveLength(3);
    for (const l of lineups) expect(validatePicks(l.picks)).toEqual([]);

    const settled = races.find((r) => r.status === "settled")!;
    const results = await world.store.listResults(settled.id);
    expect(results.length).toBeGreaterThan(10);
    expect(results.filter((r) => r.aiProfileId)).toHaveLength(3);
    expect((await world.store.listXp()).length).toBeGreaterThan(0);
    expect((await world.store.listUserBadges()).length).toBeGreaterThan(0);

    const again = await buildDemoWorld(NOW);
    expect((await again.store.listResults(settled.id)).map((r) => r.raceScore)).toEqual(results.map((r) => r.raceScore));
  });

  it("settlement is idempotent", async () => {
    const world = await buildDemoWorld(NOW);
    const settled = (await world.store.listRaces()).find((r) => r.status === "settled")!;
    const xpBefore = (await world.store.listXp()).length;
    const outcome = await settleRace(world.store, settled.id, DEMO_ACTOR, NOW, world.makeId);
    expect(outcome.alreadySettled).toBe(true);
    expect(outcome.xpAdded).toEqual([]);
    expect((await world.store.listXp()).length).toBe(xpBefore);
  });

  it("rejects lineups after the deadline, duplicates, and edits", async () => {
    const world = await buildDemoWorld(NOW);
    const open = (await world.store.getRace(world.openRaceId))!;
    const narratives = await world.store.listNarratives();
    const picks = [
      { role: "leader" as const, narrativeId: narratives[0].id, energy: 50 },
      { role: "challenger" as const, narrativeId: narratives[1].id, energy: 30 },
      { role: "wildcard" as const, narrativeId: narratives[2].id, energy: 20 },
    ];
    const lineup = await world.store.createLineup({ raceId: open.id, userId: "usr_test", picks, thesis: "test" }, NOW);
    expect(lineup.status).toBe("locked");
    await expect(world.store.createLineup({ raceId: open.id, userId: "usr_test", picks, thesis: null }, NOW)).rejects.toMatchObject({ code: "duplicate" } satisfies Partial<StoreError>);
    await expect(world.store.createLineup({ raceId: open.id, userId: "usr_late", picks, thesis: null }, open.locksAt)).rejects.toMatchObject({ code: "deadline_passed" });
    const live = (await world.store.getRace(world.liveRaceId))!;
    await expect(world.store.createLineup({ raceId: live.id, userId: "usr_late", picks, thesis: null }, NOW)).rejects.toMatchObject({ code: "state" });
  });

  it("void races do not award XP or count toward streaks", async () => {
    const world = await buildDemoWorld(NOW);
    const xpBefore = (await world.store.listXp()).length;
    const race = await voidRace(world.store, world.liveRaceId, "Data outage", DEMO_ACTOR);
    expect(race.status).toBe("void");
    const lineups = await world.store.listLineups(race.id);
    expect(lineups.every((l) => l.status === "void")).toBe(true);
    await expect(settleRace(world.store, race.id, DEMO_ACTOR, NOW, world.makeId)).rejects.toThrow(/void/);
    expect((await world.store.listXp()).length).toBe(xpBefore);
    expect((await world.store.listResults(race.id))).toEqual([]);
  });
});

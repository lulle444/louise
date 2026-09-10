import type { MarketDataProvider } from "@/lib/data/provider";
import { computeNarrativeRaw } from "@/lib/data/snapshots";
import { NARRATIVE_FORMULA_VERSION, rankScores, scoreFromRaw } from "@/lib/scoring/narrative-score";
import type { DataStore } from "@/lib/store/types";
import type { NarrativeSnapshot, Race, SnapshotKind } from "@/lib/types";

export const PRELOCK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Window definition per snapshot kind. */
export function windowFor(race: Race, kind: SnapshotKind, atIso: string): { fromIso: string; atIso: string } {
  if (kind === "prelock") {
    return { fromIso: new Date(Date.parse(race.locksAt) - PRELOCK_WINDOW_MS).toISOString(), atIso: race.locksAt };
  }
  if (kind === "reference") {
    const at = Date.parse(race.locksAt) - PRELOCK_WINDOW_MS;
    return { fromIso: new Date(at - PRELOCK_WINDOW_MS).toISOString(), atIso: new Date(at).toISOString() };
  }
  if (kind === "final") return { fromIso: race.startsAt, atIso: race.endsAt };
  return { fromIso: race.startsAt, atIso };
}

/**
 * Compute a full set of narrative snapshots for a Race at a point in time and
 * persist them. Ranking is computed across narratives with usable data;
 * unavailable narratives are ranked last.
 */
export async function takeRaceSnapshot(
  store: DataStore,
  provider: MarketDataProvider,
  race: Race,
  kind: SnapshotKind,
  atIso: string,
  makeId: (prefix: string) => string,
): Promise<NarrativeSnapshot[]> {
  const narratives = (await store.listNarratives()).filter((n) => n.active);
  const window = windowFor(race, kind, atIso);
  const rows: Omit<NarrativeSnapshot, "rank">[] = [];
  for (const n of narratives) {
    const version = await store.getConstituentVersion(n.currentConstituentVersionId);
    if (!version) continue;
    const result = await computeNarrativeRaw(provider, version.constituents, window);
    const { normalized, score } = scoreFromRaw(result.raw);
    rows.push({
      id: makeId("snp"),
      raceId: race.id,
      narrativeId: n.id,
      kind,
      takenAt: window.atIso,
      raw: result.raw,
      normalized: result.quality === "ok" ? normalized : { price: 0, breadth: 0, volume: 0, momentum: 0 },
      score: result.quality === "ok" ? score : 0,
      source: provider.name,
      constituentVersionId: version.id,
      formulaVersion: NARRATIVE_FORMULA_VERSION,
      quality: result.quality,
    });
  }
  const ok = rankScores(rows.filter((r) => r.quality === "ok"));
  const bad = rows.filter((r) => r.quality !== "ok").map((r, i) => ({ ...r, rank: ok.length + i + 1 }));
  const snapshots: NarrativeSnapshot[] = [...ok, ...bad];
  await store.insertSnapshots(snapshots);
  return snapshots;
}

/** Group snapshots by takenAt, ascending. */
export function groupSnapshots(snapshots: NarrativeSnapshot[]): { takenAt: string; kind: SnapshotKind; rows: NarrativeSnapshot[] }[] {
  const map = new Map<string, NarrativeSnapshot[]>();
  for (const s of snapshots) {
    const key = `${s.kind}|${s.takenAt}`;
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return [...map.entries()]
    .map(([key, rows]) => ({ kind: key.split("|")[0] as SnapshotKind, takenAt: key.split("|")[1], rows }))
    .sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt) || kindOrder(a.kind) - kindOrder(b.kind));
}

function kindOrder(kind: SnapshotKind): number {
  return { reference: 0, prelock: 1, interval: 2, final: 3 }[kind];
}

export function latestRaceSnapshot(snapshots: NarrativeSnapshot[]): NarrativeSnapshot[] {
  const groups = groupSnapshots(snapshots).filter((g) => g.kind === "interval" || g.kind === "final");
  return groups.length ? groups[groups.length - 1].rows : [];
}

export function previousRaceSnapshot(snapshots: NarrativeSnapshot[]): NarrativeSnapshot[] {
  const groups = groupSnapshots(snapshots).filter((g) => g.kind === "interval" || g.kind === "final");
  return groups.length > 1 ? groups[groups.length - 2].rows : [];
}

export function snapshotOfKind(snapshots: NarrativeSnapshot[], kind: SnapshotKind): NarrativeSnapshot[] {
  return snapshots.filter((s) => s.kind === kind);
}

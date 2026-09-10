import type { Metadata } from "next";
import { DemoBadge } from "@/components/DemoBadge";
import { NarrativeCard } from "@/components/NarrativeCard";
import { SectionHeading } from "@/components/SectionHeading";
import { getSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { groupSnapshots, latestRaceSnapshot, snapshotOfKind } from "@/lib/services/snapshots";

export const metadata: Metadata = { title: "Narratives" };

export default async function NarrativesPage() {
  const { store, demo } = await getSession();
  const [narratives, races] = await Promise.all([store.listNarratives(), store.listRaces()]);
  const live = races.find((r) => r.status === "live") ?? races.find((r) => r.status === "published") ?? null;
  const snapshots = live ? await store.listSnapshots(live.id) : [];
  const latest = live?.status === "published" ? snapshotOfKind(snapshots, "prelock") : latestRaceSnapshot(snapshots);
  const latestById = new Map(latest.map((s) => [s.narrativeId, s]));
  const frames = groupSnapshots(snapshots).filter((g) => g.kind !== "reference");
  const seriesFor = (id: string) => frames.map((g) => g.rows.find((r) => r.narrativeId === id)?.score ?? 0);
  const settled = races.filter((r) => r.status === "settled");
  const history = new Map<string, number[]>();
  for (const r of settled) {
    const fin = snapshotOfKind(await store.listSnapshots(r.id), "final");
    for (const s of fin) history.set(s.narrativeId, [...(history.get(s.narrativeId) ?? []), s.rank]);
  }
  const versions = new Map(await Promise.all(narratives.map(async (n) => [n.id, await store.getConstituentVersion(n.currentConstituentVersionId)] as const)));

  return (
    <div className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Directory"
        title="Narratives"
        description={`Nine sectors with transparent, versioned constituent sets. Component metrics from ${live ? live.name : "the latest snapshot"}${latest[0] ? `, taken ${formatDateTime(latest[0].takenAt)}` : ""}.`}
        action={demo ? <DemoBadge /> : null}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...narratives]
          .sort((a, b) => (latestById.get(a.id)?.rank ?? 99) - (latestById.get(b.id)?.rank ?? 99))
          .map((n) => {
            const v = versions.get(n.id);
            const hist = history.get(n.id) ?? [];
            return (
              <NarrativeCard
                key={n.id}
                narrative={n}
                snapshot={latestById.get(n.id) ?? null}
                href={`/narratives/${n.slug}`}
                series={seriesFor(n.id)}
                footer={
                  <div className="mt-3 space-y-1 text-xs text-muted">
                    <p className="truncate">
                      <span className="text-dim">Assets:</span> {v?.constituents.map((c) => c.symbol).join(" · ") ?? "—"}
                    </p>
                    <p>
                      <span className="text-dim">Past finishes:</span> {hist.length ? hist.map((h) => `#${h}`).join(" ") : "none yet"}
                    </p>
                  </div>
                }
              />
            );
          })}
      </div>
    </div>
  );
}

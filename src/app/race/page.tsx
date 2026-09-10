import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { DemoBadge } from "@/components/DemoBadge";
import { EmptyState } from "@/components/EmptyState";
import { RaceCountdown } from "@/components/RaceCountdown";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";
import { getSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { latestRaceSnapshot, snapshotOfKind } from "@/lib/services/snapshots";
import type { Race } from "@/lib/types";

export const metadata: Metadata = { title: "Races" };

export default async function RacesPage() {
  const session = await getSession();
  const { store, viewer } = session;
  const races = await store.listRaces();
  const narratives = await store.listNarratives();
  const byId = new Map(narratives.map((n) => [n.id, n]));

  const cards = await Promise.all(
    races.map(async (race) => {
      const [lineups, snapshots] = await Promise.all([store.listLineups(race.id), store.listSnapshots(race.id)]);
      const latest = race.status === "settled" ? snapshotOfKind(snapshots, "final") : race.status === "published" ? snapshotOfKind(snapshots, "prelock") : latestRaceSnapshot(snapshots);
      const top = [...latest].sort((a, b) => a.rank - b.rank)[0];
      const mine = viewer ? lineups.find((l) => l.userId === viewer.id) : null;
      return { race, entrants: lineups.filter((l) => l.kind === "human").length, leading: top ? byId.get(top.narrativeId) : null, mine };
    }),
  );

  const groups: { title: string; filter: (r: Race) => boolean; empty: string }[] = [
    { title: "Open for lineups", filter: (r) => r.status === "published", empty: "No Race is accepting lineups right now." },
    { title: "Live now", filter: (r) => r.status === "live", empty: "No live Race." },
    { title: "Settled", filter: (r) => r.status === "settled" || r.status === "void" || r.status === "archived", empty: "No settled Races yet." },
  ];

  return (
    <div className="space-y-10 py-8">
      <SectionHeading eyebrow="Weekly narrative races" title="Races" description="One lineup per player per Race. Lineups lock before the Race starts and cannot be changed." />
      {!cards.length ? <EmptyState title="No Races yet" description="An admin needs to create and publish the first Race." /> : null}
      {groups.map((g) => {
        const items = cards.filter((c) => g.filter(c.race));
        return (
          <section key={g.title} aria-labelledby={`group-${g.title}`} className="space-y-3">
            <h2 id={`group-${g.title}`} className="eyebrow">{g.title}</h2>
            {!items.length ? <p className="text-sm text-dim">{g.empty}</p> : null}
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map(({ race, entrants, leading, mine }) => (
                <li key={race.id}>
                  <Link href={`/race/${race.id}`} className="card block p-4 transition hover:border-cyan/50" data-testid="race-card-link">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={race.status} />
                      {race.isDemo ? <DemoBadge /> : null}
                      <span className="ml-auto font-mono text-xs text-muted">
                        {formatDate(race.startsAt)} → {formatDate(race.endsAt)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{race.name}</h3>
                      <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="eyebrow">Entrants</dt>
                        <dd className="mono">{entrants}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">{race.status === "settled" ? "Winner" : race.status === "published" ? "Pre-lock #1" : "Leading"}</dt>
                        <dd className="truncate font-medium" style={{ color: leading?.accentColor }}>{leading?.name ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">{race.status === "published" ? "Locks in" : race.status === "live" ? "Ends in" : "Status"}</dt>
                        <dd>{race.status === "published" ? <RaceCountdown target={race.locksAt} label="Locks in" compact /> : race.status === "live" ? <RaceCountdown target={race.endsAt} label="Ends in" compact /> : <span className="text-muted">{race.status}</span>}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 flex items-center gap-1.5 text-xs">
                      {mine ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                          <span className="text-lime">Your lineup is locked</span>
                        </>
                      ) : race.status === "published" ? (
                        <span className="text-cyan">You haven&apos;t entered — build a lineup</span>
                      ) : (
                        <span className="text-dim">{viewer ? "You did not enter" : "Sign in to track your entries"}</span>
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

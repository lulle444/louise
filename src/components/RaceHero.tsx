import Link from "next/link";
import type { Race } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { DemoBadge } from "./DemoBadge";
import { RaceCountdown } from "./RaceCountdown";
import { StatusPill } from "./StatusPill";

export function RaceHero({
  race,
  entrants,
  leading,
  href,
  children,
}: {
  race: Race;
  entrants: number;
  leading?: { name: string; color: string } | null;
  href?: string;
  children?: React.ReactNode;
}) {
  const countdown =
    race.status === "published"
      ? { target: race.locksAt, label: "Lineups lock in" }
      : race.status === "live"
        ? { target: race.endsAt, label: "Race ends in" }
        : null;
  return (
    <section className="card relative overflow-hidden p-5 sm:p-6" aria-labelledby={`race-hero-${race.id}`}>
      <div className="pointer-events-none absolute inset-0 grid-lines" aria-hidden="true" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={race.status} />
            {race.isDemo ? <DemoBadge /> : null}
            <span className="font-mono text-xs text-muted">
              {formatDate(race.startsAt)} → {formatDate(race.endsAt)}
            </span>
          </div>
          <h2 id={`race-hero-${race.id}`} className="text-2xl font-bold tracking-tight sm:text-3xl">
            {href ? (
              <Link href={href} className="hover:underline">
                {race.name}
              </Link>
            ) : (
              race.name
            )}
          </h2>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="eyebrow">Entrants</dt>
              <dd className="mono">{entrants}</dd>
            </div>
            <div>
              <dt className="eyebrow">Locks</dt>
              <dd className="mono">{formatDateTime(race.locksAt)}</dd>
            </div>
            {leading ? (
              <div>
                <dt className="eyebrow">{race.status === "settled" ? "Winner" : "Leading"}</dt>
                <dd className="font-semibold" style={{ color: leading.color }}>
                  {leading.name}
                </dd>
              </div>
            ) : null}
          </dl>
          {children}
        </div>
        {countdown ? <RaceCountdown target={countdown.target} label={countdown.label} /> : null}
      </div>
    </section>
  );
}

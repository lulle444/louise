import Link from "next/link";
import type { Race } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { DemoBadge } from "./DemoBadge";
import { ProgressArc } from "./ProgressArc";
import { requestNow } from "@/lib/time";
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
  const now = requestNow();
  const span = (a: string | null, b: string) => (a ? Math.max(0, Math.min(1, (now - Date.parse(a)) / Math.max(1, Date.parse(b) - Date.parse(a)))) : 0);
  const arc =
    race.status === "published"
      ? { value: span(race.publishedAt, race.locksAt), label: "Entry window", sub: "elapsed before lock", color: "#22D3EE" }
      : race.status === "live"
        ? { value: span(race.startsAt, race.endsAt), label: "Race progress", sub: "of the scoring window", color: "#22D3EE" }
        : race.status === "settled"
          ? { value: 1, label: "Race complete", sub: "settled", color: "#8B5CF6" }
          : null;
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          {arc ? <ProgressArc value={arc.value} label={arc.label} sublabel={arc.sub} color={arc.color} /> : null}
          {countdown ? <RaceCountdown target={countdown.target} label={countdown.label} /> : null}
        </div>
      </div>
    </section>
  );
}

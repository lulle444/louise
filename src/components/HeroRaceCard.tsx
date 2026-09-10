import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Narrative, Race } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { NarrativeIcon } from "./NarrativeIcon";
import { RaceCountdown } from "./RaceCountdown";
import { StatusPill } from "./StatusPill";

/** Compact "live weekly race" summary in the hero, modelled on a battle card. */
export function HeroRaceCard({
  race,
  leading,
  leadingScore,
  leadingDelta,
  humans,
  ai,
  userStatus,
  demo,
}: {
  race: Race;
  leading: Narrative | null;
  leadingScore: number | null;
  leadingDelta: number | null;
  humans: number;
  ai: number;
  userStatus: string;
  demo: boolean;
}) {
  const open = race.status === "published";
  return (
    <div className="card relative p-6" data-testid="hero-race-card">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{open ? "Weekly race · open" : "Live weekly race"}</p>
        <StatusPill status={race.status} />
      </div>
      <div className="mt-5 flex items-center gap-4">
        {leading ? (
          <span className="grid h-14 w-14 place-items-center rounded-xl border" style={{ background: `${leading.accentColor}18`, borderColor: `${leading.accentColor}55`, color: leading.accentColor }}>
            <NarrativeIcon name={leading.icon} className="h-7 w-7" />
          </span>
        ) : null}
        <div>
          <p className="text-2xl font-bold leading-tight">
            {leading?.name ?? race.name}
            {leading ? <span className="ml-2 font-mono text-sm font-medium text-muted">{leading.shortName} · {open ? "PRE-LOCK #1" : "LEADING"}</span> : null}
          </p>
          <p className="text-sm text-muted">
            {race.name} · {formatDate(race.startsAt)} → {formatDate(race.endsAt)}
          </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="eyebrow eyebrow-muted">{open ? "Pre-lock score" : "Leading score"}</p>
          <p className="mono mt-1 text-3xl font-bold">{leadingScore !== null ? leadingScore.toFixed(1) : "—"}</p>
          {leadingDelta !== null ? (
            <p className={`mono text-sm ${leadingDelta >= 0 ? "text-up" : "text-down"}`}>
              {leadingDelta >= 0 ? "+" : ""}
              {leadingDelta.toFixed(1)} vs start
            </p>
          ) : (
            <p className="mono text-sm text-muted">{demo ? "demo data" : "live data"}</p>
          )}
        </div>
        <div>
          <p className="eyebrow eyebrow-muted">{open ? "Locks in" : "Settles in"}</p>
          <p className="mono mt-1 text-3xl font-bold text-primary">
            <RaceCountdown target={open ? race.locksAt : race.endsAt} label={open ? "Locks in" : "Settles in"} compact />
          </p>
          <p className="text-sm text-muted">
            {humans} players locked · {ai} AI
          </p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
        <p>
          <span className="text-muted">Your status:</span> <span className="font-semibold">{userStatus}</span>
        </p>
        <Link href={`/race/${race.id}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          {open ? "Build lineup" : "Open Race"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

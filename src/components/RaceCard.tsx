import Link from "next/link";
import type { Lineup, Narrative, Profile, Race, RaceResult } from "@/lib/types";
import { formatDate, formatDateTime, ordinal } from "@/lib/format";
import { Avatar } from "./Avatar";
import { DemoBadge } from "./DemoBadge";
import { LineupPicks } from "./LineupPicks";
import { StatusPill } from "./StatusPill";

/** Shareable public Race Card for a locked or settled lineup. */
export function RaceCard({
  lineup,
  race,
  profile,
  result,
  narrativeById,
  aiName,
}: {
  lineup: Lineup;
  race: Race;
  profile: Profile | null;
  result: RaceResult | null;
  narrativeById: Map<string, Narrative>;
  aiName?: string | null;
}) {
  const finishes = result
    ? {
        leader: { finish: result.leaderFinish, hit: result.leaderHit, points: result.leaderPoints },
        challenger: { finish: result.challengerFinish, hit: result.challengerHit, points: result.challengerPoints },
        wildcard: { finish: result.wildcardFinish, hit: result.wildcardHit, points: result.wildcardPoints },
      }
    : undefined;
  return (
    <article className="card relative overflow-hidden p-5 sm:p-6" data-testid="race-card">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
      <div className="relative space-y-5">
        <header className="flex flex-wrap items-center gap-3">
          {profile ? (
            <Link href={`/profile/${profile.username}`} className="flex items-center gap-2 hover:underline">
              <Avatar seed={profile.id} name={profile.displayName} size={36} />
              <span className="leading-tight">
                <span className="block font-semibold">{profile.displayName}</span>
                <span className="block text-xs text-dim">@{profile.username}</span>
              </span>
            </Link>
          ) : (
            <span className="font-mono font-bold tracking-widest">{aiName ?? "AI"}</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {race.isDemo ? <DemoBadge /> : null}
            <StatusPill status={lineup.status === "void" ? "void" : race.status} />
          </span>
        </header>
        <div>
          <p className="eyebrow">{race.name}</p>
          <p className="text-sm text-muted">
            {formatDate(race.startsAt)} – {formatDate(race.endsAt)} · locked {formatDateTime(lineup.lockedAt)}
          </p>
        </div>
        <LineupPicks picks={lineup.picks} narrativeById={narrativeById} finishes={finishes} />
        {lineup.thesis ? <blockquote className="border-l-2 border-primary/60 pl-3 text-sm italic text-muted">“{lineup.thesis}”</blockquote> : null}
        {result ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="card-2 px-3 py-2 text-center">
              <p className="eyebrow">Race score</p>
              <p className="mono text-2xl font-bold text-primary">{result.raceScore.toFixed(0)}</p>
            </div>
            <div className="card-2 px-3 py-2 text-center">
              <p className="eyebrow">Placed</p>
              <p className="mono text-2xl font-bold">{ordinal(result.rank)}</p>
            </div>
            <div className="card-2 px-3 py-2 text-center">
              <p className="eyebrow">XP earned</p>
              <p className="mono text-2xl font-bold text-cyan">+{result.xpAwarded}</p>
            </div>
          </div>
        ) : lineup.status === "void" ? (
          <p className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">This Race was voided{race.voidReason ? `: ${race.voidReason}` : ""}. The entry does not affect accuracy or streaks.</p>
        ) : (
          <p className="text-xs text-muted">Locked and waiting for settlement. Standings update from the published snapshot schedule.</p>
        )}
      </div>
    </article>
  );
}

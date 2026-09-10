import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BadgeIcon } from "@/components/BadgeIcon";
import { DemoBadge } from "@/components/DemoBadge";
import { EmptyState } from "@/components/EmptyState";
import { LineupPicks, ROLE_META } from "@/components/LineupPicks";
import { MetaDNAChart } from "@/components/MetaDNAChart";
import { NarrativeIcon } from "@/components/NarrativeIcon";
import { Stat } from "@/components/Stat";
import { StatusPill } from "@/components/StatusPill";
import { getSession } from "@/lib/auth/session";
import { formatDate, ordinal } from "@/lib/format";
import { BADGES } from "@/lib/scoring/badges";
import { getProfileView } from "@/lib/services/views";
import { signOut } from "@/app/login/actions";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await getSession();
  const view = await getProfileView(session, username);
  if (!view) notFound();
  const { profile, stats, dna, xp, level, badges, results, lineups, narratives } = view;
  const isMe = session.viewer?.id === profile.id;
  const narrativeById = new Map(narratives.map((n) => [n.id, n]));
  const held = new Set(badges.map((b) => b.badgeCode));
  const pendingLineups = lineups.filter((l) => !results.some((r) => r.lineupId === l.id));
  const raceById = new Map(view.races.map((r) => [r.id, r]));

  return (
    <div className="space-y-8 py-8">
      <header className="card flex flex-wrap items-center gap-4 p-5">
        <Avatar seed={profile.id} name={profile.displayName} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
            {profile.isDemo ? <DemoBadge label={profile.isGuest ? "Guest session" : "Demo player"} /> : null}
          </div>
          <p className="text-sm text-muted">@{profile.username} · joined {formatDate(profile.createdAt, { year: "numeric" })}</p>
          {profile.bio ? <p className="mt-1 text-sm text-muted">{profile.bio}</p> : null}
        </div>
        <div className="text-right">
          <p className="eyebrow">Level {level.level}</p>
          <p className="text-xl font-semibold">{level.name}</p>
          <p className="mono text-xs text-muted">
            {xp} XP{level.nextMinXp ? ` · ${level.nextMinXp - xp} to next` : ""}
          </p>
          <div className="lane mt-1 h-1.5 w-40">
            <span className="lane-fill bar-grow block bg-primary" style={{ width: `${Math.round(level.progress * 100)}%` }} aria-hidden="true" />
          </div>
        </div>
        {isMe ? (
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
          </form>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Meta Rating" value={stats.metaRating} hint={stats.provisional ? `provisional · ${stats.settledRaces}/3 settled` : `${stats.settledRaces} settled Races`} accent="#22D3EE" />
        <Stat label="Hit rate" value={`${Math.round(stats.hitRate * 100)}%`} hint={`avg score ${stats.averageScore.toFixed(1)} · best ${stats.bestScore.toFixed(0)}`} />
        <Stat label="Accuracy L / C / W" value={`${Math.round(stats.leaderAccuracy * 100)} / ${Math.round(stats.challengerAccuracy * 100)} / ${Math.round(stats.wildcardAccuracy * 100)}%`} hint="Leader · Challenger · Wildcard" />
        <Stat label="Streak" value={stats.currentStreak} hint={`best Leader run ${stats.bestLeaderStreak}`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Meta DNA</h2>
          <MetaDNAChart dna={dna} />
          {dna.ready ? (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="eyebrow">Label</dt>
                <dd className="font-semibold">{dna.label}</dd>
              </div>
              <div>
                <dt className="eyebrow">Best role</dt>
                <dd>{dna.bestRole ? ROLE_META[dna.bestRole].label : "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Best narrative</dt>
                <dd className="flex items-center gap-1.5">
                  {view.bestNarrative ? <NarrativeIcon name={view.bestNarrative.icon} className="h-3.5 w-3.5" style={{ color: view.bestNarrative.accentColor }} /> : null}
                  {view.bestNarrative?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Favorite narrative</dt>
                <dd>{view.favoriteNarrative?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Consensus tendency</dt>
                <dd className="mono">{dna.consensusTendency}%</dd>
              </div>
              <div>
                <dt className="eyebrow">Conviction calibration</dt>
                <dd className="mono">{dna.convictionCalibration}%</dd>
              </div>
            </dl>
          ) : null}
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Badges</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5" aria-label="Badges">
            {BADGES.map((b) => {
              const has = held.has(b.code);
              return (
                <li key={b.code} className={`card-2 flex flex-col items-center gap-1 px-2 py-3 text-center ${has ? "" : "opacity-40"}`} title={b.description} aria-label={`${b.name}${has ? " (earned)" : " (locked)"}`}>
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${has ? "bg-primary/15 text-primary" : "bg-surface text-dim"}`}>
                    <BadgeIcon name={b.icon} className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium">{b.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Race history</h2>
        {!results.length && !pendingLineups.length ? (
          <EmptyState title="No Races yet" description={isMe ? "Enter the open Race to start building your profile." : "This player has not entered a Race."} action={isMe ? <Link href="/race" className="btn btn-primary">Find a Race</Link> : undefined} />
        ) : null}
        <ul className="space-y-3">
          {pendingLineups.map((l) => {
            const race = raceById.get(l.raceId);
            return (
              <li key={l.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {race ? <StatusPill status={race.status} /> : null}
                  <Link href={`/race/${l.raceId}`} className="font-semibold hover:underline">{race?.name ?? "Race"}</Link>
                  <Link href={`/lineup/${l.id}`} className="ml-auto text-xs text-cyan hover:underline">Race Card</Link>
                </div>
                <div className="mt-3">
                  <LineupPicks picks={l.picks} narrativeById={narrativeById} compact />
                </div>
              </li>
            );
          })}
          {results.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status="settled" />
                <Link href={`/race/${r.raceId}`} className="font-semibold hover:underline">{r.race.name}</Link>
                <span className="text-xs text-muted">{formatDate(r.race.endsAt)}</span>
                <span className="ml-auto mono text-sm">
                  <span className="text-primary">{r.raceScore.toFixed(0)}</span> pts · {ordinal(r.rank)} · +{r.xpAwarded} XP
                </span>
                <Link href={`/lineup/${r.lineupId}`} className="text-xs text-cyan hover:underline">Race Card</Link>
              </div>
              {r.lineup ? (
                <div className="mt-3">
                  <LineupPicks
                    picks={r.lineup.picks}
                    narrativeById={narrativeById}
                    finishes={{
                      leader: { finish: r.leaderFinish, hit: r.leaderHit, points: r.leaderPoints },
                      challenger: { finish: r.challengerFinish, hit: r.challengerHit, points: r.challengerPoints },
                      wildcard: { finish: r.wildcardFinish, hit: r.wildcardHit, points: r.wildcardPoints },
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

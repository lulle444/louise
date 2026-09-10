import Link from "next/link";
import { ArrowRight, Bot, Flag, Gauge, Lock, Share2, Sparkles, Users } from "lucide-react";
import { AICoachCard } from "@/components/AICoachCard";
import { DemoBadge } from "@/components/DemoBadge";
import { Leaderboard } from "@/components/Leaderboard";
import { MetaDNAChart } from "@/components/MetaDNAChart";
import { NarrativeCard } from "@/components/NarrativeCard";
import { NarrativeTrack, type TrackRow } from "@/components/NarrativeTrack";
import { RaceHero } from "@/components/RaceHero";
import { SectionHeading } from "@/components/SectionHeading";
import { Stat } from "@/components/Stat";
import { getSession } from "@/lib/auth/session";
import { getAiVsCrowd, getLeaderboard, getProfileView, getRaceView } from "@/lib/services/views";
import { ROLE_META } from "@/components/LineupPicks";

const STEPS = [
  { icon: Flag, title: "Discover the Race", body: "Every week nine crypto narratives line up. Read the transparent pre-lock metrics." },
  { icon: Sparkles, title: "Build your lineup", body: "Pick a Leader, a Challenger and a Wildcard — three different narratives." },
  { icon: Gauge, title: "Allocate 100 Energy", body: "Spread exactly 100 virtual Energy Points to size your conviction." },
  { icon: Lock, title: "Lock before the deadline", body: "Locked lineups are immutable. Crowd Picks are revealed only after you commit." },
  { icon: Bot, title: "Race the AI and the crowd", body: "Standings update from documented market metrics. Three rule-based coaches play by the same rules." },
  { icon: Share2, title: "Settle, earn XP, share", body: "Earn XP, streaks, badges and an evolving Meta DNA. Share your Race Card." },
];

export default async function HomePage() {
  const session = await getSession();
  const { store, viewer, demo } = session;
  const races = await store.listRaces();
  const live = races.find((r) => r.status === "live") ?? null;
  const open = races.find((r) => r.status === "published") ?? null;
  const latestSettled = races.filter((r) => r.status === "settled").sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt))[0] ?? null;

  const [liveView, settledView, board, aiVsCrowd, profileView] = await Promise.all([
    live ? getRaceView(session, live.id) : null,
    latestSettled ? getRaceView(session, latestSettled.id) : null,
    getLeaderboard(session, { window: "all" }),
    getAiVsCrowd(session, 90),
    viewer ? getProfileView(session, viewer.username) : null,
  ]);

  const rows: TrackRow[] = (liveView?.standings ?? []).map((s) => ({
    narrativeId: s.narrative.id,
    slug: s.narrative.slug,
    name: s.narrative.name,
    shortName: s.narrative.shortName,
    icon: s.narrative.icon,
    accentColor: s.narrative.accentColor,
    rank: s.rank,
    previousRank: s.startRank ?? s.previousRank,
    startRank: s.startRank,
    score: s.score,
    delta: s.delta,
    quality: s.snapshot?.quality ?? "unavailable",
  }));
  const aiRows = aiVsCrowd.rows.filter((r) => r.kind === "ai");
  const crowdRow = aiVsCrowd.rows.find((r) => r.kind === "crowd");
  const trending = (liveView?.standings ?? []).slice(0, 3);
  const buildHref = open ? `/race/${open.id}` : live ? `/race/${live.id}` : "/race";
  const watchHref = live ? `/race/${live.id}` : "/race";

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* HERO */}
      <section className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-6 rise">
          <p className="eyebrow text-lime">The crypto narrative league</p>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Spot the next narrative before the crowd.</h1>
          <p className="max-w-xl text-lg text-muted">Draft three crypto narratives, allocate your conviction, and compete against AI and the market.</p>
          <div className="flex flex-wrap gap-3">
            <Link href={buildHref} className="btn btn-primary" data-testid="cta-build">
              Build My Lineup <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={watchHref} className="btn btn-secondary" data-testid="cta-watch">
              Watch Live Race
            </Link>
          </div>
          <p className="text-xs text-dim">Educational forecasting game. Virtual points only — nothing to deposit, stake or trade.</p>
        </div>
        <div className="card p-5 rise" style={{ animationDelay: "120ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">Live standings{live ? ` · ${live.name}` : ""}</p>
            {demo ? <DemoBadge /> : null}
          </div>
          {rows.length ? <NarrativeTrack rows={rows} takenAt={liveView?.latestTakenAt ?? null} compact /> : <p className="text-sm text-muted">No live Race right now.</p>}
        </div>
      </section>

      {/* CURRENT RACE */}
      {live ? (
        <section className="space-y-4">
          <SectionHeading eyebrow="Current race" title="Race in progress" description="Live rankings are computed from constituent price, breadth, volume and momentum snapshots on a fixed schedule." />
          <RaceHero race={live} entrants={liveView?.entrants ?? 0} leading={liveView?.standings[0] ? { name: liveView.standings[0].narrative.name, color: liveView.standings[0].narrative.accentColor } : null} href={`/race/${live.id}`}>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={`/race/${live.id}`} className="btn btn-secondary btn-sm">Open live Race</Link>
              {open ? (
                <Link href={`/race/${open.id}`} className="btn btn-primary btn-sm">
                  Enter {open.name}
                </Link>
              ) : null}
            </div>
          </RaceHero>
        </section>
      ) : null}

      {/* AI vs CROWD */}
      <section className="space-y-4">
        <SectionHeading eyebrow="Scoreboard" title="AI vs Crowd" description="Average Race score over the last 90 days of settled Races." action={<Link href="/ai-vs-crowd" className="btn btn-ghost btn-sm">Full comparison</Link>} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {aiRows.map((r) => (
            <Stat key={r.key} label={r.label} value={r.averageScore.toFixed(0)} hint={`${Math.round(r.leaderAccuracy * 100)}% leaders called`} accent={r.accent} />
          ))}
          {crowdRow ? <Stat label="Crowd consensus" value={crowdRow.averageScore.toFixed(0)} hint={`${Math.round(crowdRow.leaderAccuracy * 100)}% leaders called`} accent={crowdRow.accent} /> : null}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-4">
        <SectionHeading eyebrow="How it works" title="One weekly loop" />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-lime/10 text-lime">
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="mono text-xs text-dim">0{i + 1}</span>
              </div>
              <p className="mt-3 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* TRENDING */}
      {trending.length ? (
        <section className="space-y-4">
          <SectionHeading eyebrow="Trending" title="Narratives on the move" action={<Link href="/narratives" className="btn btn-ghost btn-sm">All narratives</Link>} />
          <div className="grid gap-3 md:grid-cols-3">
            {trending.map((s) => (
              <NarrativeCard key={s.narrative.id} narrative={s.narrative} snapshot={s.snapshot} previousRank={s.previousRank} href={`/narratives/${s.narrative.slug}`} />
            ))}
          </div>
        </section>
      ) : null}

      {/* TOP PLAYERS + META DNA */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <SectionHeading eyebrow="Top players" title="Meta Rating leaders" action={<Link href="/leaderboard" className="btn btn-ghost btn-sm">Leaderboard</Link>} />
          <Leaderboard rows={board.rows.slice(0, 5)} compact />
        </div>
        <div className="space-y-4">
          <SectionHeading eyebrow="Meta DNA" title={profileView ? "Your forecasting profile" : "Your forecasting profile"} />
          <div className="card p-5">
            {profileView ? (
              <>
                <MetaDNAChart dna={profileView.dna} />
                <p className="mt-3 text-sm text-muted">
                  {profileView.dna.ready ? (
                    <>
                      You read as a <span className="font-semibold text-ink">{profileView.dna.label}</span>. Best role: {profileView.dna.bestRole ? ROLE_META[profileView.dna.bestRole].label : "—"}.
                    </>
                  ) : (
                    <>Play three settled Races to unlock your Meta DNA.</>
                  )}
                </p>
                <Link href={`/profile/${viewer!.username}`} className="btn btn-secondary btn-sm mt-3">Open profile</Link>
              </>
            ) : (
              <>
                <MetaDNAChart dna={{ ready: false, sampleSize: 0, label: null, bestNarrativeId: null, favoriteNarrativeId: null, bestRole: null, earlyDiscovery: 0, convictionCalibration: 0, consensusTendency: 50, averageScore: 0, axes: [] }} />
                <p className="mt-3 text-sm text-muted">After three settled Races you get a profile: Early Hunter, Rotation Reader, Wildcard Scout, Consensus Navigator, Contrarian or Balanced Strategist.</p>
                <Link href="/login" className="btn btn-secondary btn-sm mt-3">
                  <Users className="h-4 w-4" aria-hidden="true" /> {demo ? "Play as guest" : "Sign in"}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* LATEST SETTLED */}
      {latestSettled && settledView ? (
        <section className="space-y-4">
          <SectionHeading eyebrow="Latest settled" title={latestSettled.name} description="How the three AI coaches did against the field." action={<Link href={`/race/${latestSettled.id}`} className="btn btn-ghost btn-sm">Full results</Link>} />
          <div className="grid gap-3 md:grid-cols-3">
            {settledView.aiProfiles.map((p) => (
              <AICoachCard key={p.id} profile={p} lineup={settledView.aiLineups.find((l) => l.aiProfileId === p.id) ?? null} result={settledView.results.find((r) => r.aiProfileId === p.id) ?? null} narrativeById={settledView.narrativeById} locked />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

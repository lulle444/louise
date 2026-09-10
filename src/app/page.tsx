import Link from "next/link";
import { ArrowRight, Bot, Flag, Gauge, Lock, Share2, Sparkles, Users } from "lucide-react";
import { AICoachCard } from "@/components/AICoachCard";
import { Constellation } from "@/components/Constellation";
import { DemoBadge } from "@/components/DemoBadge";
import { HeroRaceCard } from "@/components/HeroRaceCard";
import { HumansVsAi } from "@/components/HumansVsAi";
import { Leaderboard } from "@/components/Leaderboard";
import { ROLE_META } from "@/components/LineupPicks";
import { MarketCard } from "@/components/MarketCard";
import { MetaDNAChart } from "@/components/MetaDNAChart";
import { NarrativeIcon } from "@/components/NarrativeIcon";
import { NarrativeReplay } from "@/components/NarrativeReplay";
import { SectionHeading } from "@/components/SectionHeading";
import { getSession } from "@/lib/auth/session";
import { getAiVsCrowd, getLeaderboard, getProfileView, getRaceView } from "@/lib/services/views";
import type { PickRole } from "@/lib/types";

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
  const featured = live ?? open;
  const latestSettled = races.filter((r) => r.status === "settled").sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt))[0] ?? null;

  const [featuredView, settledView, board, aiVsCrowd, profileView] = await Promise.all([
    featured ? getRaceView(session, featured.id) : null,
    latestSettled ? getRaceView(session, latestSettled.id) : null,
    getLeaderboard(session, { window: "all" }),
    getAiVsCrowd(session, 90),
    viewer ? getProfileView(session, viewer.username) : null,
  ]);

  const frames = featuredView?.history ?? [];
  const startScores = frames[0]?.scores ?? {};
  const prevScores = frames[Math.max(0, frames.length - 2)]?.scores ?? {};
  const replayNarratives = (featuredView?.narratives ?? []).map((n) => ({ id: n.id, slug: n.slug, name: n.name, shortName: n.shortName, icon: n.icon, accentColor: n.accentColor }));
  const seriesFor = (id: string) => frames.map((f) => f.scores[id] ?? 0);
  const top = featuredView?.standings.slice(0, 3) ?? [];
  const leader = featuredView?.standings[0] ?? null;

  const crowdRow = aiVsCrowd.rows.find((r) => r.kind === "crowd");
  const aiRows = aiVsCrowd.rows.filter((r) => r.kind === "ai");
  const bestAi = aiRows[0];
  const humansStats = { leadersCalled: Math.round((crowdRow?.leaderAccuracy ?? 0) * (crowdRow?.races ?? 0)), races: crowdRow?.races ?? 0, wins: crowdRow?.wins ?? 0, avg: crowdRow?.averageScore ?? 0 };
  const aiStats = { leadersCalled: Math.round((bestAi?.leaderAccuracy ?? 0) * (bestAi?.races ?? 0)), races: bestAi?.races ?? 0, wins: Math.max(0, (crowdRow?.races ?? 0) - (crowdRow?.wins ?? 0)), avg: bestAi?.averageScore ?? 0 };

  const userStatus = !viewer ? (demo ? "Guest — not entered" : "Sign in to enter") : featuredView?.userLineup ? "Lineup locked" : "Not entered";
  const buildHref = open ? `/race/${open.id}` : featured ? `/race/${featured.id}` : "/race";
  const watchHref = live ? `/race/${live.id}` : "/race";

  return (
    <div className="space-y-20 pb-8">
      {/* HERO */}
      <section className="relative -mx-4 grid gap-10 px-4 pb-14 pt-14 sm:-mx-6 sm:px-6 lg:-mx-8 lg:grid-cols-[1.15fr_0.95fr] lg:items-center lg:px-8 lg:pt-20">
        <Constellation />
        <div className="relative space-y-7 stagger">
          <p className="eyebrow">The crypto narrative league</p>
          <h1 className="max-w-[12ch] text-[2.75rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[3.9rem] xl:text-[4.5rem]">
            Spot the next narrative <span className="gradient-text">before the crowd.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted sm:text-xl">Draft three crypto narratives, allocate your conviction, and compete against AI and the market.</p>
          <div className="flex flex-wrap gap-3">
            <Link href={buildHref} className="btn btn-primary px-6 py-3.5 text-base" data-testid="cta-build">
              Build My Lineup <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={watchHref} className="btn btn-secondary px-6 py-3.5 text-base" data-testid="cta-watch">
              Watch Live Race
            </Link>
          </div>
          <p className="text-sm text-dim">Virtual Energy only. No wallet, no deposits, no trades.</p>
        </div>
        <div className="relative rise" style={{ animationDelay: "120ms" }}>
          {featured && featuredView ? (
            <HeroRaceCard
              race={featured}
              leading={leader?.narrative ?? null}
              leadingScore={leader?.score ?? null}
              leadingDelta={leader && featured.status === "live" ? leader.score - (startScores[leader.narrative.id] ?? leader.score) : null}
              humans={featuredView.entrants}
              ai={featuredView.aiLineups.length || 3}
              userStatus={userStatus}
              demo={demo}
            />
          ) : (
            <div className="card p-6 text-sm text-muted">No Race scheduled. An admin can create one.</div>
          )}
        </div>
      </section>

      {/* NARRATIVE MARKETS */}
      {top.length ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <p className="eyebrow">Narrative markets · {featured?.name}</p>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted">{demo ? "Demo data · deterministic" : "Live via CoinGecko"}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {top.map((s) => (
              <MarketCard
                key={s.narrative.id}
                narrative={s.narrative}
                score={s.score}
                rank={s.rank}
                delta7d={s.score - (startScores[s.narrative.id] ?? s.score)}
                deltaLast={s.score - (prevScores[s.narrative.id] ?? s.score)}
                series={seriesFor(s.narrative.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* SCOREBOARD */}
      <section className="space-y-5">
        <SectionHeading
          eyebrow="Scoreboard"
          title="Humans vs AI, under the same rules"
          description="Every entrant — human or rule-based coach — faces the same nine narratives, the same lock and the same scoring. MEGASPRINT keeps the score."
          action={
            <Link href="/ai-vs-crowd" className="inline-flex items-center gap-1 text-primary hover:underline">
              Full comparison <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <HumansVsAi humans={humansStats} ai={aiStats} />
          <div className="card p-5" data-testid="crowd-signal">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Crowd Picks
              </p>
              <span className="mono text-sm text-muted">{featuredView?.crowd?.sampleSize ?? 0} locked</span>
            </div>
            {featuredView?.crowd ? (
              <ul className="mt-4 space-y-3">
                {(["leader", "challenger", "wildcard"] as PickRole[]).map((role) => {
                  const topPick = featuredView.crowd!.byRole[role][0];
                  const n = topPick ? featuredView.narrativeById.get(topPick.narrativeId) : null;
                  return (
                    <li key={role}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ROLE_META[role].color }}>
                          {n ? <NarrativeIcon name={n.icon} className="h-3.5 w-3.5" /> : null}
                          {ROLE_META[role].label}
                          <span className="normal-case tracking-normal text-ink">{n?.name ?? "—"}</span>
                        </span>
                        <span className="mono text-xs text-muted">
                          {topPick ? `${Math.round(topPick.share * 100)}% (${topPick.count})` : "0%"}
                        </span>
                      </div>
                      <div className="lane mt-1.5 h-1">
                        <span className="lane-fill bar-grow block" style={{ width: `${Math.round((topPick?.share ?? 0) * 100)}%`, background: ROLE_META[role].color }} aria-hidden="true" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">Crowd Picks unlock once you lock a lineup for the open Race.</p>
            )}
            <p className="mt-4 text-xs text-dim">Human lineups only. AI coach lineups are never counted in Crowd Picks.</p>
          </div>
        </div>
      </section>

      {/* LIVE STANDINGS */}
      {featured && frames.length ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow={featured.status === "live" ? "Live standings" : "Pre-lock field"}
            title={featured.name}
            description="Rankings are computed from constituent price, breadth, volume and momentum snapshots on a fixed schedule."
            action={
              <span className="flex items-center gap-2">
                {demo ? <DemoBadge /> : null}
                <Link href={`/race/${featured.id}`} className="btn btn-secondary btn-sm">Open Race</Link>
              </span>
            }
          />
          <div className="card p-5">
            <NarrativeReplay narratives={replayNarratives} frames={frames} storageKey={`race:${featured.id}`} />
          </div>
        </section>
      ) : null}

      {/* HOW IT WORKS */}
      <section className="space-y-4">
        <SectionHeading eyebrow="How it works" title="One weekly loop" />
        <ol className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
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

      {/* TOP PLAYERS + META DNA */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <SectionHeading eyebrow="Top players" title="Meta Rating leaders" action={<Link href="/leaderboard" className="text-primary hover:underline">Leaderboard →</Link>} />
          <Leaderboard rows={board.rows.slice(0, 5)} compact />
        </div>
        <div className="space-y-4">
          <SectionHeading eyebrow="Meta DNA" title="Your forecasting profile" />
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
          <SectionHeading eyebrow="Latest settled" title={latestSettled.name} description="How the three AI coaches did against the field." action={<Link href={`/race/${latestSettled.id}`} className="text-primary hover:underline">Full results →</Link>} />
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { AICoachCard } from "@/components/AICoachCard";
import { CrowdPicks } from "@/components/CrowdPicks";
import { LineupBuilder } from "@/components/LineupBuilder";
import { LineupPicks, ROLE_META } from "@/components/LineupPicks";
import { MethodologyTooltip } from "@/components/MethodologyTooltip";
import { NarrativeReplay } from "@/components/NarrativeReplay";
import { PodiumReveal } from "@/components/PodiumReveal";
import { RaceHero } from "@/components/RaceHero";
import { ScoreHistoryChart } from "@/components/LazyScoreChart";
import { ShareOnX } from "@/components/ShareOnX";
import { CopyLink } from "@/components/CopyLink";
import { Avatar } from "@/components/Avatar";
import { Stat } from "@/components/Stat";
import { getSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/config";
import { formatDateTime, ordinal } from "@/lib/format";
import { getProfileView, getRaceView, type RaceView } from "@/lib/services/views";
import type { PickRole } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ raceId: string }> }): Promise<Metadata> {
  const { raceId } = await params;
  const session = await getSession();
  const race = await session.store.getRace(raceId);
  return { title: race ? race.name : "Race" };
}

function replayNarratives(view: RaceView, highlights: Map<string, string>) {
  return view.narratives.map((n) => ({ id: n.id, slug: n.slug, name: n.name, shortName: n.shortName, icon: n.icon, accentColor: n.accentColor, highlight: highlights.get(n.id) ?? null }));
}

export default async function RacePage({ params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params;
  const session = await getSession();
  const view = await getRaceView(session, raceId);
  if (!view) notFound();
  const { race, phase, userLineup, userResult, narrativeById, crowd, aiLineups, aiProfiles, results } = view;
  const viewer = session.viewer;

  const highlights = new Map<string, string>();
  if (userLineup) for (const p of userLineup.picks) highlights.set(p.narrativeId, ROLE_META[p.role].label);
  const replayRows = replayNarratives(view, highlights);
  const frames = phase === "open" ? view.history.slice(0, 1) : view.history;
  const leading = view.standings[0] ? { name: view.standings[0].narrative.name, color: view.standings[0].narrative.accentColor } : null;

  const chartSeries = view.narratives.map((n) => ({ key: n.id, label: n.shortName, color: n.accentColor }));
  const chartData = view.history.map((h) => ({ label: formatDateTime(h.takenAt).replace(" UTC", ""), ...h.scores }));

  const aiResults = new Map(results.filter((r) => r.aiProfileId).map((r) => [r.aiProfileId!, r]));
  const humanResults = results.filter((r) => r.userId);
  const crowdAvg = humanResults.length ? humanResults.reduce((s, r) => s + r.raceScore, 0) / humanResults.length : 0;
  const bestAi = Math.max(0, ...results.filter((r) => r.aiProfileId).map((r) => r.raceScore));
  const profileView = viewer && phase === "settled" && userResult ? await getProfileView(session, viewer.username) : null;

  const shareUrl = userLineup ? `${getAppUrl()}/lineup/${userLineup.id}` : null;

  return (
    <div className="space-y-8 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/race" className="hover:text-ink">Races</Link> / <span className="text-ink">{race.name}</span>
      </nav>

      <RaceHero race={race} entrants={view.entrants} leading={phase === "open" ? null : leading}>
        {phase === "void" ? <p className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">Race voided: {race.voidReason}. No XP or streak changes apply.</p> : null}
        {phase === "open" && userLineup ? <p className="text-sm text-primary">Your lineup is locked. Crowd Picks are revealed below.</p> : null}
        {phase === "open" && !userLineup ? <p className="text-sm text-muted">Draft three narratives and allocate 100 Energy before the lock.</p> : null}
      </RaceHero>

      {/* ---------- OPEN ---------- */}
      {phase === "open" && !userLineup ? (
        <section aria-labelledby="build-heading" className="space-y-4">
          <h2 id="build-heading" className="sr-only">Build your lineup</h2>
          <LineupBuilder raceId={race.id} locksAt={race.locksAt} narratives={view.narratives.filter((n) => n.active)} snapshots={view.prelock} signedIn={Boolean(viewer)} demo={session.demo} />
        </section>
      ) : null}

      {/* ---------- USER LINEUP ---------- */}
      {userLineup ? (
        <section aria-labelledby="mine-heading" className={`card space-y-4 p-5 ${phase === "open" ? "lock-glow" : ""}`} data-testid="user-lineup">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="mine-heading" className="text-lg font-semibold">Your locked lineup</h2>
            <span className="font-mono text-xs text-muted">Locked {formatDateTime(userLineup.lockedAt)} · immutable</span>
          </div>
          <LineupPicks
            picks={userLineup.picks}
            narrativeById={narrativeById}
            finishes={
              userResult
                ? {
                    leader: { finish: userResult.leaderFinish, hit: userResult.leaderHit, points: userResult.leaderPoints },
                    challenger: { finish: userResult.challengerFinish, hit: userResult.challengerHit, points: userResult.challengerPoints },
                    wildcard: { finish: userResult.wildcardFinish, hit: userResult.wildcardHit, points: userResult.wildcardPoints },
                  }
                : undefined
            }
          />
          {userLineup.thesis ? <p className="text-sm italic text-muted">“{userLineup.thesis}”</p> : null}
          {shareUrl ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/lineup/${userLineup.id}`} className="btn btn-secondary btn-sm">View Race Card</Link>
              <CopyLink url={shareUrl} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ---------- SETTLED RESULT ---------- */}
      {phase === "settled" && userResult && userLineup ? (
        <section aria-labelledby="result-heading" className="card space-y-5 border-primary/40 p-5" data-testid="user-result">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="result-heading" className="text-lg font-semibold">Your result</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Race score" animate={{ value: userResult.raceScore }} accent="#22D3EE" hint="max 360" />
            <Stat label="Placement" value={ordinal(userResult.rank)} hint={`of ${results.length} entrants (incl. AI)`} />
            <Stat label="XP earned" animate={{ value: userResult.xpAwarded, prefix: "+" }} accent="#22D3EE" />
            <Stat label="Helped most" value={userResult.bestRole ? ROLE_META[userResult.bestRole].label : "—"} hint={userResult.bestRole ? `${narrativeById.get(userLineup.picks.find((p) => p.role === userResult.bestRole)!.narrativeId)?.name}` : "No scoring picks"} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="vs crowd average" value={`${userResult.raceScore >= crowdAvg ? "+" : ""}${(userResult.raceScore - crowdAvg).toFixed(0)}`} hint={`crowd avg ${crowdAvg.toFixed(0)}`} />
            <Stat label="vs best AI" value={`${userResult.raceScore >= bestAi ? "+" : ""}${(userResult.raceScore - bestAi).toFixed(0)}`} hint={`best AI ${bestAi.toFixed(0)}`} />
            <Stat label="Participation streak" value={profileView?.stats.currentStreak ?? "—"} hint={profileView?.dna.ready ? `Meta DNA: ${profileView.dna.label}` : "Meta DNA still building"} />
          </div>
          {shareUrl ? (
            <div className="flex flex-wrap gap-2">
              <ShareOnX text={`I scored ${userResult.raceScore.toFixed(0)} in ${race.name} on MEGASPRINT — an educational crypto narrative forecasting game (virtual points only).`} url={shareUrl} />
              <Link href={`/lineup/${userLineup.id}`} className="btn btn-ghost">Race Card</Link>
              {viewer ? <Link href={`/profile/${viewer.username}`} className="btn btn-ghost">Profile & Meta DNA</Link> : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {phase === "settled" && viewer && !userLineup ? <p className="text-sm text-muted">You did not enter this Race. Results below are for the field.</p> : null}

      {/* ---------- PODIUM ---------- */}
      {phase === "settled" ? (
        <section aria-labelledby="podium-heading" className="card p-5">
          <h2 id="podium-heading" className="mb-4 text-lg font-semibold">Podium</h2>
          <PodiumReveal rows={view.standings.map((s) => ({ narrative: s.narrative, score: s.score, rank: s.rank, startRank: s.startRank }))} />
        </section>
      ) : null}

      {/* ---------- STANDINGS ---------- */}
      {phase !== "open" || userLineup ? (
        <section aria-labelledby="standings-heading" className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 id="standings-heading" className="text-lg font-semibold">
                {phase === "settled" ? "Final narrative order" : phase === "open" ? "Pre-lock field" : "Live standings"}
              </h2>
              <MethodologyTooltip label="Narrative Score" anchor="narrative-score">
                Score = price 40% + breadth 25% + volume 20% + momentum 15%, each normalized 0–100 from the constituent data.
              </MethodologyTooltip>
            </div>
            <NarrativeReplay narratives={replayRows} frames={frames} storageKey={`race:${race.id}`} />
          </div>
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold">Score movement</h3>
            {chartData.length > 1 ? (
              <ScoreHistoryChart data={chartData} series={chartSeries} height={300} />
            ) : (
              <p className="text-sm text-muted">Movement appears once the Race starts and interval snapshots are recorded.</p>
            )}
          </div>
        </section>
      ) : null}

      {/* ---------- CROWD ---------- */}
      <section aria-labelledby="crowd-heading" className="space-y-3">
        <h2 id="crowd-heading" className="text-lg font-semibold">Crowd Picks</h2>
        <CrowdPicks crowd={crowd} narrativeById={narrativeById} hidden={!view.crowdVisible} />
      </section>

      {/* ---------- AI ---------- */}
      <section aria-labelledby="ai-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 id="ai-heading" className="text-lg font-semibold">AI coaches</h2>
          <MethodologyTooltip label="AI coaches" anchor="ai">
            Three rule-based coaches draft from the same pre-lock snapshot under the same deadline and 100-Energy rule. They never see final data.
          </MethodologyTooltip>
        </div>
        {phase === "open" && !userLineup && !aiLineups.length ? (
          <p className="text-sm text-muted">AI lineups lock at the deadline and are revealed after you lock or once the Race goes live.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {aiProfiles.map((p) => (
              <AICoachCard key={p.id} profile={p} lineup={aiLineups.find((l) => l.aiProfileId === p.id) ?? null} result={aiResults.get(p.id) ?? null} narrativeById={narrativeById} locked={phase !== "open"} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- RESULTS TABLE ---------- */}
      {phase === "settled" ? (
        <section aria-labelledby="results-heading" className="space-y-3">
          <h2 id="results-heading" className="text-lg font-semibold">Settlement board</h2>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Entrant</th>
                  {(["leader", "challenger", "wildcard"] as PickRole[]).map((r) => (
                    <th key={r} scope="col">{ROLE_META[r].label}</th>
                  ))}
                  <th scope="col">Score</th>
                  <th scope="col">XP</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 20).map((r) => {
                  const lineup = view.lineups.find((l) => l.id === r.lineupId);
                  const profile = r.userId ? view.profilesById.get(r.userId) : null;
                  const ai = r.aiProfileId ? aiProfiles.find((p) => p.id === r.aiProfileId) : null;
                  const isMe = viewer && r.userId === viewer.id;
                  return (
                    <tr key={r.id} className={isMe ? "bg-primary/5" : ""}>
                      <td className="mono text-muted">{r.rank}</td>
                      <td>
                        {profile ? (
                          <Link href={`/profile/${profile.username}`} className="flex items-center gap-2 hover:underline">
                            <Avatar seed={profile.id} name={profile.displayName} size={24} />
                            {profile.displayName}
                            {isMe ? <span className="text-xs text-primary">(you)</span> : null}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs font-bold tracking-widest" style={{ color: ai?.accentColor }}>{ai?.name ?? "AI"}</span>
                        )}
                      </td>
                      {(["leader", "challenger", "wildcard"] as PickRole[]).map((role) => {
                        const p = lineup?.picks.find((x) => x.role === role);
                        const hit = role === "leader" ? r.leaderHit : role === "challenger" ? r.challengerHit : r.wildcardHit;
                        return (
                          <td key={role} className="text-xs">
                            <span className={hit ? "text-up" : "text-muted"}>{p ? narrativeById.get(p.narrativeId)?.shortName : "—"}</span>
                            <span className="ml-1 text-dim">{p?.energy}E</span>
                          </td>
                        );
                      })}
                      <td className="mono font-semibold">{r.raceScore.toFixed(0)}</td>
                      <td className="mono text-cyan">{r.userId ? `+${r.xpAwarded}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

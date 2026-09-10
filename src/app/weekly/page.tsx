import type { Metadata } from "next";
import Link from "next/link";
import { Award, Flame, Share2 } from "lucide-react";
import { getRepository } from "@/lib/data";
import { getViewer } from "@/lib/auth/session";
import { getAppUrl, getSeason, getXHandle, getXUrl, isDemoMode } from "@/lib/config";
import { loadArenaContext } from "@/lib/services/stats";
import { buildSeasonRecap } from "@/lib/services/season";
import { formatAccuracy, formatPercent } from "@/lib/domain/format";
import { SignalCard, toSignalCardData } from "@/components/arena/SignalCard";
import { ShareActions } from "@/components/arena/ShareActions";
import { LeaderboardTable } from "@/components/profile/LeaderboardTable";
import { Avatar } from "@/components/ui/Avatar";
import { LocalTime } from "@/components/ui/LocalTime";
import { DirectionPill } from "@/components/ui/Pills";
import { PageHeader } from "@/components/ui/Section";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { XIcon } from "@/components/ui/XIcon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Weekly recap", description: "This week on Callscore: Humans vs AI score, top analysts, contrarian wins and the Call Cards that beat the machines." };

export default async function SeasonPage() {
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const ctx = await loadArenaContext(repo);
  const now = new Date();
  const season = getSeason(now);
  const recap = buildSeasonRecap(ctx, now);
  const demo = isDemoMode();
  const foundingOpen = now.getTime() < Date.parse(season.foundingWindowEndsAt);
  const shareText = `Week on Callscore: Humans ${formatAccuracy(recap.humanAccuracy)} vs AI ${formatAccuracy(recap.aiAccuracy)} · ${recap.battlesSettled} Rounds settled · ${recap.forecastsLocked} forecasts locked. Can you beat ATLAS? @${getXHandle()}`;
  const s = recap.summary;

  return (
    <>
      <PageHeader eyebrow={`${season.name} · Week in review`} title="This week on Callscore" description={<>Seven days of settled Rounds, scored under the same rules for everyone. Updated live. {demo ? <><DemoModeBadge className="ml-1 align-middle" /> <span className="block mt-2">This is the preview season on a simulated market. Season 1 launches with live prices; Founding Caller badges earned now carry over.</span></> : null}</>}>
        <div className="flex flex-col items-end gap-2">
          <ShareActions url={`${getAppUrl()}/weekly`} text={shareText} />
          <a href={getXUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text"><XIcon className="size-3.5" /> Weekly scoreboard posts on @{getXHandle()}</a>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        {/* Founding window */}
        <section className={`card flex flex-wrap items-center justify-between gap-4 p-5 ${foundingOpen ? "border-cyan/40" : ""}`} aria-label="Founding Caller">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan"><Award className="size-5" aria-hidden /></span>
            <div>
              <p className="font-semibold">Founding Caller badge {foundingOpen ? <span className="ml-2 rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan">open</span> : <span className="ml-2 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">closed</span>}</p>
              <p className="mt-1 text-sm text-muted">
                {foundingOpen ? <>Lock any forecast before <LocalTime iso={season.foundingWindowEndsAt} /> and it is yours permanently. It is never awarded again.</> : <>The founding window closed <LocalTime iso={season.foundingWindowEndsAt} />. {recap.foundingCount} analysts hold the badge.</>}
              </p>
            </div>
          </div>
          {foundingOpen ? <Link href="/rounds" className="rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Make today’s call</Link> : null}
        </section>

        {/* Week numbers */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Humans · this week" value={formatAccuracy(recap.humanAccuracy)} accent="text-cyan" hint={`${recap.weekWins.humans} Rounds won`} />
          <StatCard label="AI · this week" value={formatAccuracy(recap.aiAccuracy)} accent="text-violet" hint={`${recap.weekWins.ai} Rounds won · ${recap.weekWins.ties} ties`} />
          <StatCard label="Rounds settled" value={recap.battlesSettled} hint={<>since <LocalTime iso={recap.weekStart} /></>} />
          <StatCard label="Forecasts locked" value={recap.forecastsLocked} hint={`${recap.activeAnalysts} active analysts`} />
          <StatCard label="Season score" value={`${formatAccuracy(s.humanAccuracy.accuracy)} · ${formatAccuracy(s.aiAccuracy.accuracy)}`} hint="Humans · AI, all settled Rounds" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Featured cards */}
          <section aria-labelledby="featured-heading">
            <h2 id="featured-heading" className="mb-3 text-base font-semibold">Cards that beat the machines</h2>
            <p className="mb-4 text-sm text-muted">Correct forecasts that went against the crowd majority, or landed while every AI analyst was wrong.</p>
            {recap.featured.length === 0 ? (
              <EmptyState title="No upsets this week" description="When a human beats the crowd or all three AI profiles, the card lands here." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recap.featured.map((f) => {
                  const data = toSignalCardData({ id: f.prediction.id, kind: "human", profile: f.profile, asset: f.asset, battle: f.battle, direction: f.prediction.direction, signalIds: f.prediction.signalIds, allSignals: ctx.signals, confidence: f.prediction.confidence, thesis: f.prediction.thesis, lockedAt: f.prediction.lockedAt, referencePrice: f.prediction.referencePrice, result: f.prediction.result, battleScore: f.prediction.battleScore, xpAwarded: f.prediction.xpAwarded, beatAI: f.beatAllAI ? ctx.aiProfiles.filter((a) => f.battle.aiProfileIds.includes(a.id)).map((a) => a.name) : [] });
                  return (
                    <div key={f.prediction.id}>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">{f.beatAllAI ? "Beat every AI" : `Against ${100 - f.crowdShare}% of the crowd`}</p>
                      <Link href={`/call/${f.prediction.id}`} className="block rounded-[14px]"><SignalCard data={data} showLink={false} className="card-hover h-full" /></Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Side: contrarians, streak, crowd wrong */}
          <div className="space-y-6">
            <section className="card p-5" aria-labelledby="contrarian-heading">
              <h2 id="contrarian-heading" className="text-base font-semibold">Contrarian leaderboard</h2>
              <p className="mb-3 text-xs text-muted">Correct while disagreeing with the crowd majority, last seven days.</p>
              {recap.contrarians.length === 0 ? <p className="text-sm text-muted">Nobody has beaten the crowd this week yet.</p> : (
                <ol className="divide-y divide-border">
                  {recap.contrarians.map((c, i) => (
                    <li key={c.profile.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="num w-4 text-muted">{i + 1}</span>
                      <Avatar name={c.profile.displayName} size="sm" />
                      <Link href={`/profile/${c.profile.username}`} className="min-w-0 flex-1 truncate hover:underline">{c.profile.displayName}</Link>
                      <span className="num text-bull">{c.wins}</span><span className="num text-xs text-muted">/ {c.attempts}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="card p-5" aria-labelledby="streak-heading">
              <h2 id="streak-heading" className="inline-flex items-center gap-2 text-base font-semibold"><Flame className="size-4 text-bull" aria-hidden /> Longest active streak</h2>
              {recap.longestActiveStreak ? (
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={recap.longestActiveStreak.profile.displayName} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${recap.longestActiveStreak.profile.username}`} className="font-semibold hover:underline">{recap.longestActiveStreak.profile.displayName}</Link>
                    <p className="text-xs text-muted">@{recap.longestActiveStreak.profile.username}</p>
                  </div>
                  <p className="num text-3xl font-semibold text-bull">{recap.longestActiveStreak.streak}</p>
                </div>
              ) : <p className="mt-2 text-sm text-muted">No active streaks.</p>}
            </section>

            <section className="card p-5" aria-labelledby="crowd-heading">
              <h2 id="crowd-heading" className="text-base font-semibold">When the crowd was most wrong</h2>
              {recap.crowdWrongest ? (
                <div className="mt-2 text-sm text-muted">
                  <Link href={`/rounds/${recap.crowdWrongest.battle.id}`} className="font-semibold text-text hover:underline">{recap.crowdWrongest.battle.title}</Link>
                  <p className="mt-2">{recap.crowdWrongest.share}% of the crowd said <DirectionPill direction={recap.crowdWrongest.crowd} size="sm" />. The market closed <DirectionPill direction={recap.crowdWrongest.outcome} size="sm" />{recap.crowdWrongest.battle.startPrice && recap.crowdWrongest.battle.endPrice ? <span className="num"> ({formatPercent(((recap.crowdWrongest.battle.endPrice - recap.crowdWrongest.battle.startPrice) / recap.crowdWrongest.battle.startPrice) * 100)})</span> : null}.</p>
                </div>
              ) : <p className="mt-2 text-sm text-muted">The crowd majority was right in every settled Round this week.</p>}
            </section>
          </div>
        </div>

        {/* Weekly leaderboard */}
        <section aria-labelledby="week-lb-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 id="week-lb-heading" className="text-base font-semibold">Top analysts this week</h2>
            <Link href="/leaderboard?range=week" className="text-sm text-cyan hover:underline">Full weekly leaderboard →</Link>
          </div>
          {recap.leaderboard.length === 0 ? <EmptyState title="No settled forecasts this week yet" /> : <LeaderboardTable rows={recap.leaderboard} highlightUserId={viewer?.id ?? null} />}
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="inline-flex items-center gap-2 font-semibold"><Share2 className="size-4 text-cyan" aria-hidden /> Post your receipts</p>
            <p className="mt-1 text-sm text-muted">Lock it or it didn’t happen. Share a locked Call Card before settlement and tag @{getXHandle()}.</p>
          </div>
          <Link href="/rounds" className="rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Make today’s call</Link>
        </section>
        <p className="text-xs text-muted">Educational forecasting game using virtual points. Track records are forecasting-game history, not investment performance.</p>
      </div>
    </>
  );
}

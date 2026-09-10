import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck, Target, Trophy } from "lucide-react";
import { TallyMark } from "@/components/ui/TallyMark";
import { formatPrice as fmtPrice } from "@/lib/domain/format";
import { getRepository } from "@/lib/data";
import { maybeRunMaintenance } from "@/lib/services/maintenance";
import { getViewer } from "@/lib/auth/session";
import { getMarketDataProvider } from "@/lib/market";
import { isDemoMode } from "@/lib/config";
import { listBattleSummaries } from "@/lib/services/battle-view";
import { buildHumansVsAi, buildLeaderboard, buildProfileStats, loadArenaContext } from "@/lib/services/stats";
import { aggregateCrowd, canRevealCrowd } from "@/lib/domain/crowd";
import { formatPercent } from "@/lib/domain/format";
import { BattleCountdown } from "@/components/arena/BattleCountdown";
import { CrowdSignal } from "@/components/arena/CrowdSignal";
import { Scoreboard } from "@/components/arena/Scoreboard";
import { AssetMark } from "@/components/arena/AssetMark";
import { SignalDNAChart } from "@/components/charts/SignalDNAChart";
import { Section } from "@/components/ui/Section";
import { DirectionPill, StatusPill } from "@/components/ui/Pills";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, DataUnavailable } from "@/components/ui/States";
import { SignalField } from "@/components/ui/SignalField";
import { MarketStrip } from "@/components/arena/MarketStrip";
import { Suspense } from "react";
import { getSeason } from "@/lib/config";
import { formatAccuracy } from "@/lib/domain/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await maybeRunMaintenance();
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const provider = getMarketDataProvider();
  const [summaries, ctx] = await Promise.all([listBattleSummaries(repo, viewer), loadArenaContext(repo)]);
  const live = summaries.find((s) => s.status === "open") ?? summaries.find((s) => s.status === "locked") ?? summaries.find((s) => s.status === "upcoming") ?? null;
  const settled = summaries.filter((s) => s.status === "settled").slice(0, 6);
  const hva = buildHumansVsAi(ctx);
  const leaderboard = buildLeaderboard(ctx, { range: "all" }).filter((r) => r.ranked).slice(0, 5);

  let livePrice: { price: number } | null = null;
  let priceUnavailable = false;
  if (live) {
    try {
      livePrice = await provider.getCurrentPrice(live.asset.symbol);
    } catch {
      priceUnavailable = true;
    }
  }

  const livePredictions = live ? ctx.predictions.filter((p) => p.battleId === live.battle.id) : [];
  const viewerLocked = Boolean(viewer && livePredictions.some((p) => p.userId === viewer.id));
  const crowdRevealed = live ? canRevealCrowd({ viewerHasLocked: viewerLocked, battleAcceptingPredictions: live.status === "open" }) : false;

  // Call Profile preview: the viewer's own when available, otherwise the top ranked analyst.
  const dnaProfile = (viewer && ctx.profiles.find((p) => p.id === viewer.id)) || leaderboard[0]?.profile || null;
  const dnaStats = dnaProfile ? buildProfileStats(ctx, dnaProfile) : null;
  const demo = isDemoMode();

  return (
    <>
      {/* Scoreboard ticker */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5"><Trophy className="size-3.5 text-cyan" aria-hidden /> {getSeason().name}</span>
          <span>Humans <span className="font-semibold text-cyan">{formatAccuracy(hva.humanAccuracy.accuracy)}</span></span>
          <span>AI <span className="font-semibold text-violet">{formatAccuracy(hva.aiAccuracy.accuracy)}</span></span>
          <span>{hva.battleWins.humans + hva.battleWins.ai + hva.battleWins.ties} rounds settled</span>
          {live ? <span className="ml-auto inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${live.status === "open" ? "bg-cyan signal-pulse" : "bg-neutral"}`} aria-hidden /> {live.asset.symbol} round {live.status === "open" ? "open" : live.status} · {live.status === "open" ? "locks in" : live.status === "upcoming" ? "opens in" : "settles in"} <BattleCountdown target={live.status === "open" ? live.battle.locksAt : live.status === "upcoming" ? live.battle.opensAt : live.battle.endsAt} className="text-text" /></span> : null}
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <SignalField opacity={0.5} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-14 text-center sm:px-6 lg:pt-20">
          <div className="mx-auto mb-5 flex items-center justify-center gap-2">
            <TallyMark size={44} />
          </div>
          <p className="eyebrow">The scoreboard for crypto calls</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
            Make the call. <span className="text-cyan">Keep</span> <span className="text-violet">the score.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg">
            One crypto call a day. Back it with three signals, lock it, and let the market grade you, the crowd and three AI analysts by the same rules.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={live ? `/rounds/${live.battle.id}` : "/rounds"} className="inline-flex items-center gap-2 rounded-lg bg-cyan px-6 py-3 text-sm font-semibold text-white shadow-glow-cyan transition hover:brightness-110">
              Make today’s call <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/humans-vs-ai" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold hover:border-border-strong">
              Humans vs AI so far
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted">Virtual points only. No wallet, no deposits, no trades.</p>
          {demo ? (
            <p className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              <DemoModeBadge />
              <span>Season 1 launches with live prices. <Link href="/weekly" className="text-cyan hover:underline">Preview season recap →</Link></span>
            </p>
          ) : null}

          {/* Today's round: wide card */}
          <div className="card mx-auto mt-10 max-w-5xl p-5 text-left sm:p-6" aria-labelledby="live-battle-heading">
            {live ? (
              <div className="grid gap-6 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
                <div className="flex items-center gap-3">
                  <AssetMark symbol={live.asset.symbol} size="lg" />
                  <div>
                    <p id="live-battle-heading" className="eyebrow">Today’s round</p>
                    <p className="text-xl font-bold">{live.asset.name} <span className="font-mono text-sm font-normal text-muted">{live.asset.symbol} · 24H</span></p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-4 md:border-l md:border-border md:pl-6">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted">{demo ? "Simulated price" : "Reference price"}</dt>
                    <dd className="num mt-1 text-xl font-semibold">{priceUnavailable ? <span className="text-sm text-neutral">Unavailable</span> : livePrice ? `$${fmtPrice(livePrice.price, live.asset.priceDecimals)}` : "—"}</dd>
                    {live.battle.startPrice && livePrice ? <dd className={`num text-xs ${livePrice.price >= live.battle.startPrice ? "text-bull" : "text-bear"}`}>{formatPercent(((livePrice.price - live.battle.startPrice) / live.battle.startPrice) * 100)} since open</dd> : null}
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted">{live.status === "open" ? "Locks in" : live.status === "upcoming" ? "Opens in" : "Settles in"}</dt>
                    <dd className="num mt-1 text-xl font-semibold text-cyan"><BattleCountdown target={live.status === "open" ? live.battle.locksAt : live.status === "upcoming" ? live.battle.opensAt : live.battle.endsAt} /></dd>
                    <dd className="text-xs text-muted">{live.participantCount} calls locked · {live.aiCount} AI</dd>
                  </div>
                </dl>
                <div className="md:text-right">
                  <StatusPill status={live.status} />
                  <p className="mt-2 text-xs text-muted">You: <span className={live.viewerState === "not-entered" ? "text-text" : "text-cyan"}>{live.viewerState === "not-entered" ? "not in yet" : live.viewerState === "locked" ? "locked" : "settled"}</span></p>
                </div>
                <Link href={`/rounds/${live.battle.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-text px-5 py-3 text-sm font-semibold text-white hover:bg-text/90">{live.viewerState === "not-entered" && live.status === "open" ? "Make your call" : "Open round"} <ArrowRight className="size-4" aria-hidden /></Link>
                {priceUnavailable ? <div className="md:col-span-4"><DataUnavailable /></div> : null}
              </div>
            ) : (
              <EmptyState title="No round scheduled" description="The next Daily Round will appear here once it is published." action={{ href: "/rounds", label: "Browse rounds" }} />
            )}
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6"><div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse" />)}</div></div>}>
        <MarketStrip />
      </Suspense>

      {/* Scoreboard + crowd preview */}
      <Section eyebrow="Scoreboard" title="Humans vs AI, under the same rules" description="Every analyst — human or simulated — faces the same market, timeframe and scoring. Callscore keeps the score." action={{ href: "/humans-vs-ai", label: "Full comparison" }}>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Scoreboard summary={hva} compact />
          <CrowdSignal
            crowd={crowdRevealed ? aggregateCrowd(livePredictions) : null}
            revealed={crowdRevealed}
            teaserTotal={livePredictions.length}
            reason={viewer ? "Lock your own forecast in today’s Round to reveal the exact split." : "Sign in and lock a forecast in today’s Round to reveal the exact split. Percentages stay hidden so the crowd never shapes your thesis."}
          />
        </div>
      </Section>

      {/* How it works */}
      <Section eyebrow="How it works" title="Three steps. One public record.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { Icon: Target, title: "Make the call.", body: "Bullish, neutral or bearish on today’s asset, backed by exactly three signals. Lock it before the deadline." },
            { Icon: Trophy, title: "Beat the machines.", body: "ATLAS, PULSE and DRIFT make the same call under the same rules. The crowd is hidden until you commit." },
            { Icon: ShieldCheck, title: "Keep the score.", body: "Every call is timestamped, locked and graded at settlement. Your record is public and can’t be edited." },
          ].map((s, i) => (
            <div key={s.title} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan"><s.Icon className="size-4" aria-hidden /></span>
                <span className="num text-xs text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Latest settled */}
      <Section eyebrow="Verified results" title="Latest settled Rounds" action={{ href: "/rounds?tab=settled", label: "All settled" }}>
        {settled.length ? (
          <div className="card overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted"><th className="px-4 py-3">Round</th><th className="px-4 py-3 text-right">Start</th><th className="px-4 py-3 text-right">End</th><th className="px-4 py-3 text-right">Move</th><th className="px-4 py-3">Outcome</th><th className="px-4 py-3 text-right">Calls</th></tr></thead>
              <tbody>
                {settled.map((s) => (
                  <tr key={s.battle.id} className="border-b border-border/60 hover:bg-surface-2/60">
                    <td className="px-4 py-3"><Link href={`/rounds/${s.battle.id}`} className="inline-flex items-center gap-2 font-semibold hover:underline"><AssetMark symbol={s.asset.symbol} size="sm" /> {s.battle.title}</Link></td>
                    <td className="num px-4 py-3 text-right">${fmtPrice(s.battle.startPrice, s.asset.priceDecimals)}</td>
                    <td className="num px-4 py-3 text-right">${fmtPrice(s.battle.endPrice, s.asset.priceDecimals)}</td>
                    <td className={`num px-4 py-3 text-right font-semibold ${s.change === null ? "text-muted" : s.change > 0 ? "text-bull" : s.change < 0 ? "text-bear" : "text-neutral"}`}>{formatPercent(s.change)}</td>
                    <td className="px-4 py-3"><DirectionPill direction={s.battle.outcome} size="sm" /></td>
                    <td className="num px-4 py-3 text-right">{s.participantCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card relative overflow-hidden p-6">
            <SignalField opacity={0.3} />
            <div className="relative grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="eyebrow">{getSeason().name} · first results</p>
                <p className="mt-2 text-lg font-semibold">{live ? <>The first Round settles in <span className="text-cyan"><BattleCountdown target={live.battle.endsAt} /></span></> : "The first Round settles soon"}</p>
                <p className="mt-1 text-sm text-muted">Every settled Round appears here with its start and end price, the outcome, and how humans, the crowd and the AI analysts scored.</p>
              </div>
              <Link href={live ? `/rounds/${live.battle.id}` : "/rounds"} className="rounded-md bg-cyan px-4 py-2 text-center text-sm font-semibold text-white hover:brightness-110">Lock a forecast</Link>
            </div>
          </div>
        )}
      </Section>

      {/* Top analysts + DNA */}
      <Section eyebrow="Track records" title="Top analysts and Call Profile" description="Ranked accounts need at least five settled Rounds. Ratings reward accuracy, experience and consistency." action={{ href: "/leaderboard", label: "Leaderboard" }}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card divide-y divide-border">
            {leaderboard.length === 0 ? (
              <div className="p-5">
                <p className="text-sm font-semibold">The leaderboard is open</p>
                <p className="mt-1 text-sm text-muted">Nobody is ranked yet. Five settled Rounds earn a rank; forecasts locked this week earn the permanent Founding Caller badge.</p>
                <ul className="mt-4 space-y-2">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted">
                      <span className="num w-5">{n}</span>
                      <span className="size-7 rounded-full border border-dashed border-border" aria-hidden />
                      <span className="flex-1">{n === 1 ? "Your name here" : "Open"}</span>
                      <span className="num text-xs">—</span>
                    </li>
                  ))}
                </ul>
                <Link href="/weekly" className="mt-4 inline-block text-sm text-cyan hover:underline">Founding Caller details →</Link>
              </div>
            ) : leaderboard.map((r) => (
              <Link key={r.profile.id} href={`/profile/${r.profile.username}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50">
                <span className="num w-5 text-sm text-muted">{r.rank}</span>
                <Avatar name={r.profile.displayName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{r.profile.displayName}</span>
                  <span className="block font-mono text-[11px] text-muted">L{r.level.level} {r.level.name} · {r.settled} settled</span>
                </span>
                <span className="num text-sm">{formatAccuracy(r.accuracy)}</span>
                <span className="num w-12 text-right text-sm font-semibold text-cyan">{r.rating.toFixed(1)}</span>
              </Link>
            ))}
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Call Profile {dnaProfile ? <span className="font-normal text-muted">· {viewer && dnaProfile.id === viewer.id ? "you" : dnaProfile.displayName}</span> : null}</p>
              {dnaStats?.dna.style ? <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet">{dnaStats.dna.style}</span> : null}
            </div>
            {dnaStats && dnaStats.dna.ready ? (
              <>
                <SignalDNAChart data={dnaStats.dna.radar} />
                <p className="text-xs text-muted">{dnaStats.dna.styleReason} Best signal: {dnaStats.dna.bestSignal?.name ?? "—"}. Best asset: {dnaStats.dna.bestAsset?.symbol ?? "—"}.</p>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm font-semibold">Building your Call Profile</p>
                <p className="mt-1 text-xs text-muted">Call Profile is computed from at least five settled Rounds. Make today’s call to start.</p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
          <SignalField opacity={0.35} />
          <div className="relative">
            <p className="eyebrow">Ready?</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Make the call. Beat the machines. Keep the score.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">The market has millions of opinions. Callscore keeps the score.</p>
            <Link href={live ? `/rounds/${live.battle.id}` : "/rounds"} className="mt-6 inline-flex items-center gap-2 rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-white shadow-glow-cyan hover:brightness-110">
              <Lock className="size-4" aria-hidden /> Make today’s call
            </Link>
            <div className="mx-auto mt-8 max-w-2xl"><Disclaimer compact /></div>
          </div>
        </div>
      </section>
    </>
  );
}

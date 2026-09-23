import Link from "next/link";
import { ArrowRight, Lock, Trophy } from "lucide-react";
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
      <div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 pt-5 font-mono text-[11px] uppercase tracking-wider text-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5"><Trophy className="size-3.5 text-cyan" aria-hidden /> {demo ? "Preview" : getSeason().name}</span>
          <span>Humans <span className="font-semibold text-cyan">{formatAccuracy(hva.humanAccuracy.accuracy)}</span></span>
          <span>AI <span className="font-semibold text-violet">{formatAccuracy(hva.aiAccuracy.accuracy)}</span></span>
          <span>{hva.battleWins.humans + hva.battleWins.ai + hva.battleWins.ties} rounds settled</span>
          {live ? <span className="ml-auto inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${live.status === "open" ? "bg-cyan signal-pulse" : "bg-neutral"}`} aria-hidden /> {live.asset.symbol} round {live.status === "open" ? "open" : live.status} · {live.status === "open" ? "locks in" : live.status === "upcoming" ? "opens in" : "settles in"} <BattleCountdown target={live.status === "open" ? live.battle.locksAt : live.status === "upcoming" ? live.battle.opensAt : live.battle.endsAt} className="text-text" /></span> : null}
        </div>
      </div>

      {/* Hero */}
      <section className="relative">
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="eyebrow">The scoreboard for crypto calls</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              You vs the machines.<br />
              <span className="text-cyan">Who</span> calls crypto <span className="text-bull">best?</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
              Make your call, lock it, and build a graded track record against three AI analysts and the crowd.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={live ? `/rounds/${live.battle.id}` : "/rounds"} className="btn-primary">
                Make today’s call <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/methodology" className="btn-secondary">
                How scoring works
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted">Virtual points only · No wallet, no deposits, no trades · Same rules for humans and AI</p>
            {demo ? (
              <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-muted">
                <DemoModeBadge />
                <span>Season 1 launches with live prices. <Link href="/weekly" className="text-cyan hover:underline">Preview season recap →</Link></span>
              </p>
            ) : null}
          </div>

          {/* Hero visual: today's round inside a frosted panel with floating stats */}
          <div className="relative lg:pl-6 lg:pt-8">
            <div className="hero-visual glass relative overflow-hidden rounded-[28px] p-3 sm:p-4 lg:pt-28">
              <div className="hero-art pointer-events-none absolute inset-0" aria-hidden>
                <svg viewBox="0 0 600 420" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="hero-wave" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4433e6" stopOpacity="0" /><stop offset="0.5" stopColor="#4433e6" stopOpacity="0.35" /><stop offset="1" stopColor="#4433e6" stopOpacity="0" /></linearGradient>
                    <linearGradient id="hero-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6a5cff" stopOpacity="0.9" /><stop offset="1" stopColor="#4433e6" stopOpacity="0.25" /></linearGradient>
                  </defs>
                  <path d="M-20 300 C 120 250, 200 360, 330 300 S 520 220, 640 280" fill="none" stroke="url(#hero-wave)" strokeWidth="2" />
                  <path d="M-20 330 C 120 280, 200 390, 330 330 S 520 250, 640 310" fill="none" stroke="url(#hero-wave)" strokeWidth="1.2" />
                  <g opacity="0.55">
                    <rect x="392" y="120" width="26" height="70" rx="6" fill="url(#hero-bar)" />
                    <rect x="428" y="90" width="26" height="100" rx="6" fill="url(#hero-bar)" />
                    <rect x="464" y="56" width="26" height="134" rx="6" fill="url(#hero-bar)" />
                    <rect x="500" y="30" width="26" height="160" rx="6" fill="url(#hero-bar)" />
                  </g>
                </svg>
              </div>

              <div className="card relative p-5" aria-labelledby="live-battle-heading">
                {live ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p id="live-battle-heading" className="eyebrow">Today’s round</p>
                      <StatusPill status={live.status} />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <AssetMark symbol={live.asset.symbol} size="lg" />
                      <div>
                        <p className="text-xl font-semibold">{live.asset.name} <span className="font-mono text-sm text-muted">{live.asset.symbol} · 24H</span></p>
                        <p className="text-xs text-muted">{live.battle.title}</p>
                      </div>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted">{demo ? "Simulated price" : "Reference price"}</dt>
                        <dd className="num mt-1 text-2xl font-semibold">{priceUnavailable ? <span className="text-sm text-neutral">Unavailable</span> : livePrice ? `$${fmtPrice(livePrice.price, live.asset.priceDecimals)}` : "—"}</dd>
                        {live.battle.startPrice && livePrice ? <dd className={`num text-xs ${livePrice.price >= live.battle.startPrice ? "text-bull" : "text-bear"}`}>{formatPercent(((livePrice.price - live.battle.startPrice) / live.battle.startPrice) * 100)} since open</dd> : null}
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted">{live.status === "open" ? "Locks in" : live.status === "upcoming" ? "Opens in" : "Settles in"}</dt>
                        <dd className="num mt-1 text-2xl font-semibold text-cyan"><BattleCountdown target={live.status === "open" ? live.battle.locksAt : live.status === "upcoming" ? live.battle.opensAt : live.battle.endsAt} /></dd>
                        <dd className="text-xs text-muted">{live.participantCount} calls locked · {live.aiCount} AI</dd>
                      </div>
                    </dl>
                    {priceUnavailable ? <div className="mt-3"><DataUnavailable /></div> : null}
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <p className="text-xs text-muted">
                        You: <span className={live.viewerState === "not-entered" ? "text-text" : "text-cyan"}>{live.viewerState === "not-entered" ? "not in yet" : live.viewerState === "locked" ? "locked" : "settled"}</span>
                      </p>
                      <Link href={`/rounds/${live.battle.id}`} className="text-sm font-semibold text-cyan hover:underline">{live.viewerState === "not-entered" && live.status === "open" ? "Make your call →" : "Open round →"}</Link>
                    </div>
                  </>
                ) : (
                  <EmptyState title="No round scheduled" description="The next Daily Round will appear here once it is published." action={{ href: "/rounds", label: "Browse rounds" }} />
                )}
              </div>

              {/* AI analysts strip */}
              <div className="relative mt-3 flex flex-wrap items-center gap-2 px-1 pb-1">
                {hva.aiProfileStats.slice(0, 3).map((a) => (
                  <span key={a.profile.id} className="chip px-2.5 py-1.5 text-[11px] font-semibold">
                    <span className="size-2 rounded-full" style={{ background: a.profile.accentColor }} aria-hidden />
                    {a.profile.name}
                    <span className="num font-normal text-muted">{formatAccuracy(a.accuracy.accuracy)}</span>
                  </span>
                ))}
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted">Rule-based AI · same clock</span>
              </div>
            </div>

            {/* Floating stat card */}
            <div className="card float-y absolute left-0 top-0 hidden w-60 p-4 shadow-glow-cyan lg:block" aria-label="Humans vs AI so far">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Humans vs AI</p>
              <p className="num mt-2 text-3xl font-semibold leading-none"><span className="text-cyan">{formatAccuracy(hva.humanAccuracy.accuracy)}</span> <span className="text-base text-muted">vs</span> <span className="text-violet">{formatAccuracy(hva.aiAccuracy.accuracy)}</span></p>
              <p className="mt-2 text-xs text-muted">Accuracy across {hva.battleWins.humans + hva.battleWins.ai + hva.battleWins.ties} settled Rounds</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stat bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6" aria-label="Key numbers">
        <div className="card grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {[
            { label: "Rounds settled", value: String(hva.battleWins.humans + hva.battleWins.ai + hva.battleWins.ties), hint: `Humans ${hva.battleWins.humans} · AI ${hva.battleWins.ai} · Ties ${hva.battleWins.ties}` },
            { label: "Human accuracy", value: formatAccuracy(hva.humanAccuracy.accuracy), hint: `${hva.humanAccuracy.correct}/${hva.humanAccuracy.valid} calls correct`, accent: "text-cyan" },
            { label: "AI accuracy", value: formatAccuracy(hva.aiAccuracy.accuracy), hint: `${hva.aiAccuracy.correct}/${hva.aiAccuracy.valid} calls correct`, accent: "text-violet" },
            { label: "Calls locked", value: String(ctx.predictions.length), hint: `${ctx.profiles.length} analysts on the board` },
          ].map((k) => (
            <div key={k.label} className="px-6 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{k.label}</p>
              <p className={`num mt-2 text-3xl font-semibold leading-none ${k.accent ?? ""}`}>{k.value}</p>
              <p className="mt-2 text-xs text-muted">{k.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6"><div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse" />)}</div></div>}>
        <MarketStrip />
      </Suspense>

      {/* Scoreboard + crowd preview */}
      <Section eyebrow="Scoreboard" title="Humans vs AI, under the same rules" description="Every analyst — human or simulated — faces the same market, timeframe and scoring. Alphr keeps the score." action={{ href: "/humans-vs-ai", label: "Full comparison" }}>
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
        <div className="grid gap-5 md:grid-cols-3">
          {/* 1. Make the call */}
          <article className="card card-hover overflow-hidden">
            <div className="feature-art relative h-52 overflow-hidden" aria-hidden>
              <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_20%,rgba(68,51,230,0.18),transparent_70%),radial-gradient(60%_50%_at_80%_90%,rgba(21,128,61,0.14),transparent_70%)]" />
              <div className="absolute left-6 top-6 flex flex-col gap-2.5">
                {[
                  { name: "Market Trend", color: "#15803D" },
                  { name: "Momentum", color: "#4F46E5" },
                  { name: "Volume", color: "#2563EB" },
                ].map((sig, i) => (
                  <span key={sig.name} className="chip px-3 py-2 text-xs font-semibold" style={{ marginLeft: i * 14 }}>
                    <span className="size-2 rounded-full" style={{ background: sig.color }} />
                    {sig.name}
                  </span>
                ))}
              </div>
              <div className="chip absolute bottom-5 right-5 px-3 py-2 text-xs font-semibold text-bull">▲ Bullish · 72%</div>
            </div>
            <div className="p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">01 · Make the call</p>
              <h3 className="mt-2 text-lg font-bold tracking-tight">Three signals, one direction</h3>
              <p className="mt-2 text-sm text-muted">Bullish, neutral or bearish on today’s asset, backed by exactly three signals and a confidence level. Lock it before the deadline.</p>
              <Link href={live ? `/rounds/${live.battle.id}` : "/rounds"} className="mt-4 inline-block text-sm font-semibold text-cyan hover:underline">Open today’s Round →</Link>
            </div>
          </article>

          {/* 2. Beat the machines */}
          <article className="card card-hover overflow-hidden">
            <div className="feature-art relative h-52 overflow-hidden" aria-hidden>
              <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_70%_20%,rgba(180,83,9,0.16),transparent_70%),radial-gradient(60%_50%_at_20%_90%,rgba(68,51,230,0.16),transparent_70%)]" />
              <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 items-center justify-between">
                <div className="chip flex-col items-start gap-0.5 px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">You</span>
                  <span className="num text-xl font-semibold text-cyan">{formatAccuracy(hva.humanAccuracy.accuracy)}</span>
                </div>
                <span className="font-mono text-xs tracking-[0.3em] text-muted">VS</span>
                <div className="flex flex-col gap-1.5">
                  {hva.aiProfileStats.slice(0, 3).map((a) => (
                    <span key={a.profile.id} className="chip px-2.5 py-1 text-[11px] font-semibold">
                      <span className="size-1.5 rounded-full" style={{ background: a.profile.accentColor }} />
                      {a.profile.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">02 · Beat the machines</p>
              <h3 className="mt-2 text-lg font-bold tracking-tight">Same market, same clock</h3>
              <p className="mt-2 text-sm text-muted">ATLAS, PULSE and DRIFT make the same call under the same rules. The crowd stays hidden until you commit, so nobody anchors you.</p>
              <Link href="/humans-vs-ai" className="mt-4 inline-block text-sm font-semibold text-cyan hover:underline">See the scoreboard →</Link>
            </div>
          </article>

          {/* 3. Keep the score */}
          <article className="card card-hover overflow-hidden">
            <div className="feature-art relative h-52 overflow-hidden" aria-hidden>
              <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_10%,rgba(68,51,230,0.14),transparent_70%),radial-gradient(60%_50%_at_90%_90%,rgba(21,128,61,0.12),transparent_70%)]" />
              <div className="glass absolute inset-x-8 top-7 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Call Card</span>
                  <span className="rounded-full bg-bull/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-bull">Correct</span>
                </div>
                <p className="num mt-3 text-2xl font-semibold">BTC · +1.4%</p>
                <p className="mt-1 text-[11px] text-muted">Locked 09:12 UTC · settled 00:00 UTC</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="fill-bar h-full w-3/4 rounded-full bg-cyan" /></div>
              </div>
            </div>
            <div className="p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">03 · Keep the score</p>
              <h3 className="mt-2 text-lg font-bold tracking-tight">Timestamped, locked, graded</h3>
              <p className="mt-2 text-sm text-muted">Every call becomes a public Call Card with the result printed on it. Your record can’t be edited, so it means something.</p>
              <Link href="/leaderboard" className="mt-4 inline-block text-sm font-semibold text-cyan hover:underline">Browse track records →</Link>
            </div>
          </article>
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
              <Link href={live ? `/rounds/${live.battle.id}` : "/rounds"} className="rounded-full bg-cyan px-4 py-2 text-center text-sm font-semibold text-white hover:brightness-110">Lock a forecast</Link>
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
              {dnaStats?.dna.style ? <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-text">{dnaStats.dna.style}</span> : null}
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
        <div className="glass relative overflow-hidden rounded-[28px] p-8 text-center sm:p-12">
          <SignalField opacity={0.35} />
          <div className="relative">
            <p className="eyebrow">Ready?</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Make the call. Beat the machines. Keep the score.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">The market has millions of opinions. Alphr keeps the score.</p>
            <Link href={live ? `/rounds/${live.battle.id}` : "/rounds"} className="btn-primary mt-6">
              <Lock className="size-4" aria-hidden /> Make today’s call
            </Link>
            <div className="mx-auto mt-8 max-w-2xl"><Disclaimer compact /></div>
          </div>
        </div>
      </section>
    </>
  );
}

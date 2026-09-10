import Link from "next/link";
import { ArrowRight, Lock, Radar, ShieldCheck, Target } from "lucide-react";
import { getRepository } from "@/lib/data";
import { maybeRunMaintenance } from "@/lib/services/maintenance";
import { getViewer } from "@/lib/auth/session";
import { getMarketDataProvider } from "@/lib/market";
import { isDemoMode } from "@/lib/config";
import { listBattleSummaries } from "@/lib/services/battle-view";
import { buildHumansVsAi, buildLeaderboard, buildProfileStats, loadArenaContext } from "@/lib/services/stats";
import { aggregateCrowd, canRevealCrowd } from "@/lib/domain/crowd";
import { formatPercent, formatPrice } from "@/lib/domain/format";
import { BattleCard } from "@/components/arena/BattleCard";
import { BattleCountdown } from "@/components/arena/BattleCountdown";
import { CrowdSignal } from "@/components/arena/CrowdSignal";
import { Scoreboard } from "@/components/arena/Scoreboard";
import { AssetMark } from "@/components/arena/AssetMark";
import { SignalDNAChart } from "@/components/charts/SignalDNAChart";
import { Section } from "@/components/ui/Section";
import { StatusPill } from "@/components/ui/Pills";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, DataUnavailable } from "@/components/ui/States";
import { SignalField } from "@/components/ui/SignalField";
import { formatAccuracy } from "@/lib/domain/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await maybeRunMaintenance();
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const provider = getMarketDataProvider();
  const [summaries, ctx] = await Promise.all([listBattleSummaries(repo, viewer), loadArenaContext(repo)]);
  const live = summaries.find((s) => s.status === "open") ?? summaries.find((s) => s.status === "locked") ?? summaries.find((s) => s.status === "upcoming") ?? null;
  const settled = summaries.filter((s) => s.status === "settled").slice(0, 3);
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

  // Signal DNA preview: the viewer's own when available, otherwise the top ranked analyst.
  const dnaProfile = (viewer && ctx.profiles.find((p) => p.id === viewer.id)) || leaderboard[0]?.profile || null;
  const dnaStats = dnaProfile ? buildProfileStats(ctx, dnaProfile) : null;
  const demo = isDemoMode();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <SignalField opacity={0.55} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="eyebrow">The Market Intelligence Arena</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Humans vs AI.<br />
              <span className="bg-gradient-to-r from-cyan via-text to-violet bg-clip-text text-transparent">Who reads crypto markets best?</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
              Build your signal, lock your forecast, and create a verified track record against AI and the crowd.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={live ? `/arena/${live.battle.id}` : "/arena"} className="inline-flex items-center gap-2 rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-bg shadow-glow-cyan transition hover:brightness-110">
                Enter Today’s Battle <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/arena" className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-5 py-3 text-sm font-semibold hover:border-border-strong">
                View Live Arena
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted">Virtual XP only. No wallet, no deposits, no trades.</p>
            {demo ? (
              <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-muted">
                <DemoModeBadge />
                <span>Season 1 launches with live prices. <Link href="/season" className="text-cyan hover:underline">Preview season recap →</Link></span>
              </p>
            ) : null}
          </div>

          {/* Live battle card */}
          <div className="card relative p-5 lg:self-center" aria-labelledby="live-battle-heading">
            {live ? (
              <>
                <div className="flex items-center justify-between">
                  <p id="live-battle-heading" className="eyebrow">Live Daily Battle</p>
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
                    <dd className="num mt-1 text-2xl font-semibold">{priceUnavailable ? <span className="text-sm text-neutral">Unavailable</span> : livePrice ? `$${formatPrice(livePrice.price, live.asset.priceDecimals)}` : "—"}</dd>
                    {live.battle.startPrice && livePrice ? <dd className={`num text-xs ${livePrice.price >= live.battle.startPrice ? "text-bull" : "text-bear"}`}>{formatPercent(((livePrice.price - live.battle.startPrice) / live.battle.startPrice) * 100)} vs start</dd> : null}
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted">{live.status === "open" ? "Locks in" : live.status === "upcoming" ? "Opens in" : "Settles in"}</dt>
                    <dd className="num mt-1 text-2xl font-semibold text-cyan"><BattleCountdown target={live.status === "open" ? live.battle.locksAt : live.status === "upcoming" ? live.battle.opensAt : live.battle.endsAt} /></dd>
                    <dd className="text-xs text-muted">{live.participantCount} analysts locked · {live.aiCount} AI</dd>
                  </div>
                </dl>
                {priceUnavailable ? <div className="mt-3"><DataUnavailable /></div> : null}
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-xs text-muted">
                    Your status: <span className={live.viewerState === "not-entered" ? "text-text" : "text-cyan"}>{live.viewerState === "not-entered" ? "Not entered" : live.viewerState === "locked" ? "Locked" : "Settled"}</span>
                  </p>
                  <Link href={`/arena/${live.battle.id}`} className="text-sm font-semibold text-cyan hover:underline">{live.viewerState === "not-entered" && live.status === "open" ? "Enter Battle →" : "Open Battle →"}</Link>
                </div>
              </>
            ) : (
              <EmptyState title="No Battle scheduled" description="The next Daily Battle will appear here once it is published." action={{ href: "/arena", label: "Browse the Arena" }} />
            )}
          </div>
        </div>
      </section>

      {/* Scoreboard + crowd preview */}
      <Section eyebrow="Scoreboard" title="Humans vs AI, under the same rules" description="Every analyst — human or simulated — faces the same market, timeframe and scoring. The Arena keeps the score." action={{ href: "/humans-vs-ai", label: "Full comparison" }}>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Scoreboard summary={hva} compact />
          <CrowdSignal
            crowd={crowdRevealed ? aggregateCrowd(livePredictions) : null}
            revealed={crowdRevealed}
            teaserTotal={livePredictions.length}
            reason={viewer ? "Lock your own forecast in today’s Battle to reveal the exact split." : "Sign in and lock a forecast in today’s Battle to reveal the exact split. Percentages stay hidden so the crowd never shapes your thesis."}
          />
        </div>
      </Section>

      {/* How it works */}
      <Section eyebrow="How it works" title="Three steps. One public track record.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { Icon: Target, title: "Build your signal.", body: "Choose three market indicators and lock your thesis before the clock runs out." },
            { Icon: Radar, title: "Challenge the AI.", body: "Humans and AI analysts face the same market, timeframe, and scoring rules." },
            { Icon: ShieldCheck, title: "Create a real track record.", body: "Every forecast is timestamped, locked, and scored when the Battle settles." },
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
      <Section eyebrow="Verified results" title="Latest settled Battles" action={{ href: "/arena?tab=settled", label: "All settled" }}>
        {settled.length ? (
          <div className="grid gap-4 md:grid-cols-3">{settled.map((s) => <BattleCard key={s.battle.id} summary={s} compact />)}</div>
        ) : (
          <EmptyState title="Nothing settled yet" description="Results appear here once the first Battle reaches its end time." />
        )}
      </Section>

      {/* Top analysts + DNA */}
      <Section eyebrow="Track records" title="Top analysts and Signal DNA" description="Ranked accounts need at least five settled Battles. Ratings reward accuracy, experience and consistency." action={{ href: "/leaderboard", label: "Leaderboard" }}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card divide-y divide-border">
            {leaderboard.length === 0 ? <p className="p-5 text-sm text-muted">No ranked analysts yet.</p> : leaderboard.map((r) => (
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
              <p className="text-sm font-semibold">Signal DNA {dnaProfile ? <span className="font-normal text-muted">· {viewer && dnaProfile.id === viewer.id ? "you" : dnaProfile.displayName}</span> : null}</p>
              {dnaStats?.dna.style ? <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet">{dnaStats.dna.style}</span> : null}
            </div>
            {dnaStats && dnaStats.dna.ready ? (
              <>
                <SignalDNAChart data={dnaStats.dna.radar} />
                <p className="text-xs text-muted">{dnaStats.dna.styleReason} Best signal: {dnaStats.dna.bestSignal?.name ?? "—"}. Best asset: {dnaStats.dna.bestAsset?.symbol ?? "—"}.</p>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm font-semibold">Building your Signal DNA</p>
                <p className="mt-1 text-xs text-muted">Signal DNA is computed from at least five settled Battles. Enter today’s Battle to start.</p>
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
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Pick your signals. Challenge the AI. Prove your edge.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">The market has millions of opinions. SIGNAL ARENA keeps the score.</p>
            <Link href={live ? `/arena/${live.battle.id}` : "/arena"} className="mt-6 inline-flex items-center gap-2 rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-bg shadow-glow-cyan hover:brightness-110">
              <Lock className="size-4" aria-hidden /> Enter Today’s Battle
            </Link>
            <div className="mx-auto mt-8 max-w-2xl"><Disclaimer compact /></div>
          </div>
        </div>
      </section>
    </>
  );
}

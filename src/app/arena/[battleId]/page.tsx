import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { getRepository } from "@/lib/data";
import { getViewer } from "@/lib/auth/session";
import { getMarketDataProvider } from "@/lib/market";
import { getAppUrl, isDemoMode } from "@/lib/config";
import { buildBattleView } from "@/lib/services/battle-view";
import { streakAfterBattle } from "@/lib/services/stats";
import { formatNeutralBand } from "@/lib/domain/settlement";
import { formatPercent, formatPrice } from "@/lib/domain/format";
import { AssetMark } from "@/components/arena/AssetMark";
import { BattleCountdown } from "@/components/arena/BattleCountdown";
import { CrowdSignal } from "@/components/arena/CrowdSignal";
import { AIPositionCard } from "@/components/arena/AIProfileCard";
import { PredictionComposer } from "@/components/arena/PredictionComposer";
import { ShareActions } from "@/components/arena/ShareActions";
import { SignalCard, toSignalCardData } from "@/components/arena/SignalCard";
import { MarketChart } from "@/components/charts/MarketChart";
import { LocalTime } from "@/components/ui/LocalTime";
import { DirectionPill, ResultPill, StatusPill } from "@/components/ui/Pills";
import { DataUnavailable } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/arena/[battleId]">): Promise<Metadata> {
  const { battleId } = await props.params;
  const repo = await getRepository();
  const battle = await repo.getBattle(battleId);
  if (!battle) return { title: "Battle" };
  return { title: battle.title, description: `Forecast ${battle.title}: Bullish, Neutral or Bearish with three supporting signals.` };
}

export default async function BattlePage(props: PageProps<"/arena/[battleId]">) {
  const { battleId } = await props.params;
  const sp = await props.searchParams;
  const justLocked = sp.locked === "1";
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const view = await buildBattleView(repo, getMarketDataProvider(), battleId, viewer);
  if (!view) notFound();
  const { battle, asset, status, signals } = view;
  const mine = view.viewerPrediction;
  const settled = status === "settled";
  const voided = status === "void";
  const ended = settled || voided;
  const demo = isDemoMode();

  const aiWithProfiles = view.aiPredictions.map((p) => ({ prediction: p, profile: view.aiProfiles.find((a) => a.id === p.aiProfileId) })).filter((x) => x.profile);
  let myCard = null;
  if (mine) {
    const history = await repo.listPredictions({ userId: mine.userId });
    const allBattles = await repo.listBattles();
    const streakAfter = mine.result === "correct" ? streakAfterBattle(history, allBattles, battle.id) : null;
    const beatAI = mine.result === "correct" ? aiWithProfiles.filter((x) => x.prediction.result === "incorrect").map((x) => x.profile!.name) : [];
    myCard = toSignalCardData({ id: mine.id, kind: "human", profile: view.viewerProfile, asset, battle, direction: mine.direction, signalIds: mine.signalIds, allSignals: signals, confidence: mine.confidence, thesis: mine.thesis, lockedAt: mine.lockedAt, referencePrice: mine.referencePrice, result: mine.result, battleScore: mine.battleScore, xpAwarded: mine.xpAwarded, streakAfter, beatAI });
  }

  const change = battle.startPrice && battle.endPrice ? ((battle.endPrice - battle.startPrice) / battle.startPrice) * 100 : null;
  const liveChange = battle.startPrice && view.livePrice ? ((view.livePrice.price - battle.startPrice) / battle.startPrice) * 100 : null;
  const crowdMajority = view.crowd?.majority ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AssetMark symbol={asset.symbol} size="lg" />
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">{asset.name} <span className="font-mono text-base text-muted">{asset.symbol} · 24H</span></h1>
              <p className="text-sm text-muted">{battle.title} · <Link href="/methodology" className="text-cyan hover:underline">rules</Link></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {demo ? <DemoModeBadge /> : null}
            <StatusPill status={status} />
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">{ended ? "End price" : demo ? "Simulated price" : "Reference price"}</dt>
            <dd className="num mt-1 text-lg font-semibold">
              {ended ? (battle.endPrice ? `$${formatPrice(battle.endPrice, asset.priceDecimals)}` : "—") : view.priceUnavailable ? <span className="text-sm text-neutral">Unavailable</span> : view.livePrice ? `$${formatPrice(view.livePrice.price, asset.priceDecimals)}` : "—"}
            </dd>
            {!ended && liveChange !== null ? <dd className={`num text-xs ${liveChange > 0 ? "text-bull" : liveChange < 0 ? "text-bear" : "text-neutral"}`}>{formatPercent(liveChange)} vs start</dd> : null}
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Start price</dt>
            <dd className="num mt-1 text-lg font-semibold">{battle.startPrice ? `$${formatPrice(battle.startPrice, asset.priceDecimals)}` : "At open"}</dd>
            <dd className="text-xs text-muted"><LocalTime iso={battle.startPriceAt ?? battle.opensAt} /></dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">{status === "upcoming" ? "Opens in" : status === "open" ? "Locks in" : ended ? "Final move" : "Settles in"}</dt>
            <dd className="num mt-1 text-lg font-semibold text-cyan">
              {ended ? <span className={change === null ? "text-muted" : change > 0 ? "text-bull" : change < 0 ? "text-bear" : "text-neutral"}>{formatPercent(change)}</span> : <BattleCountdown target={status === "upcoming" ? battle.opensAt : status === "open" ? battle.locksAt : battle.endsAt} />}
            </dd>
            <dd className="text-xs text-muted">{ended ? <>Settled <LocalTime iso={battle.endPriceAt ?? battle.endsAt} /></> : <>Lock <LocalTime iso={battle.locksAt} /></>}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">Neutral band</dt>
            <dd className="num mt-1 text-lg font-semibold text-neutral">{formatNeutralBand(battle.neutralThresholdPercent)}</dd>
            <dd className="text-xs text-muted">Inside = Neutral</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted">{ended ? "Outcome" : "Participants"}</dt>
            <dd className="mt-1 text-lg font-semibold">{ended ? <DirectionPill direction={battle.outcome} /> : <span className="num">{view.participantCount} <span className="text-sm font-normal text-muted">+ {view.aiCount} AI</span></span>}</dd>
            {ended ? <dd className="text-xs text-muted">{view.participantCount} humans · {view.aiCount} AI</dd> : null}
          </div>
        </dl>
        <div className="mt-5">
          {view.priceUnavailable ? <DataUnavailable what="Chart and price data" /> : <MarketChart series={view.series} startPrice={battle.startPrice} decimals={asset.priceDecimals} simulated={view.isMockData} opensAt={battle.opensAt} endsAt={battle.endsAt} />}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Main column */}
        <div className="space-y-6">
          {voided ? (
            <div className="card border-bear/30 p-5" role="status">
              <p className="inline-flex items-center gap-2 font-semibold text-bear"><XCircle className="size-5" aria-hidden /> Battle void</p>
              <p className="mt-1 text-sm text-muted">{battle.settlementError ?? "This Battle was voided by an administrator."} Void Battles award no score and are excluded from accuracy and leaderboards.</p>
            </div>
          ) : null}

          {settled && myCard ? (
            <div className="card p-5" data-testid="settled-result">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={`inline-flex items-center gap-2 text-lg font-semibold ${mine!.result === "correct" ? "text-bull" : "text-bear"}`}>
                  {mine!.result === "correct" ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
                  {mine!.result === "correct" ? "Correct" : "Incorrect"}
                </p>
                <ResultPill result={mine!.result} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Start → End</dt><dd className="num mt-0.5">${formatPrice(battle.startPrice, asset.priceDecimals)} → ${formatPrice(battle.endPrice, asset.priceDecimals)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Move</dt><dd className={`num mt-0.5 ${change !== null && change > 0 ? "text-bull" : change !== null && change < 0 ? "text-bear" : "text-neutral"}`}>{formatPercent(change)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Battle Score</dt><dd className="num mt-0.5 font-semibold">{mine!.battleScore ?? 0}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">XP earned</dt><dd className="num mt-0.5 font-semibold text-cyan">+{mine!.xpAwarded ?? 0}</dd></div>
              </dl>
              {view.viewerProfile ? <p className="mt-3 text-xs text-muted">Current streak: <span className="num text-text">{view.viewerProfile.currentStreak}</span> · Longest: <span className="num text-text">{view.viewerProfile.longestStreak}</span> · Total XP: <span className="num text-text">{view.viewerProfile.xp}</span></p> : null}
            </div>
          ) : null}

          {mine && myCard ? (
            <div className={justLocked ? "rise" : ""} data-testid="locked-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{settled ? "Your verified Signal Card" : "Your locked Signal Card"}</p>
                <Link href={`/signal/${mine.id}`} className="text-sm text-cyan hover:underline">Public card →</Link>
              </div>
              <SignalCard data={myCard} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <ShareActions url={`${getAppUrl()}/signal/${mine.id}`} text={`${myCard.direction.toUpperCase()} on ${asset.symbol} · ${myCard.signals.map((s) => s.name).join(" · ")} · Confidence ${mine.confidence}/5 — locked on SIGNAL ARENA`} />
                {!ended ? <p className="inline-flex items-center gap-1.5 text-xs text-muted"><Clock className="size-3.5" aria-hidden /> Settles in <BattleCountdown target={battle.endsAt} /></p> : null}
              </div>
              {/* Position vs crowd and AI */}
              {view.crowdRevealed ? (
                <div className="card mt-4 p-4 text-sm">
                  <p className="font-semibold">Your position</p>
                  <ul className="mt-2 space-y-1 text-muted">
                    <li>
                      Crowd majority: {crowdMajority ? <DirectionPill direction={crowdMajority} size="sm" /> : "no majority yet"}
                      {crowdMajority ? <span className={`ml-2 ${crowdMajority === mine.direction ? "text-cyan" : "text-neutral"}`}>{crowdMajority === mine.direction ? "you agree with the crowd" : "you are against the crowd"}</span> : null}
                    </li>
                    {aiWithProfiles.map(({ prediction, profile }) => (
                      <li key={prediction.id}>
                        <span className="font-mono text-xs" style={{ color: profile!.accentColor }}>{profile!.name}</span>: <DirectionPill direction={prediction.direction} size="sm" />
                        <span className={`ml-2 ${prediction.direction === mine.direction ? "text-cyan" : "text-neutral"}`}>{prediction.direction === mine.direction ? "agrees" : "disagrees"}</span>
                        {settled ? <span className="ml-2 text-xs">{prediction.result === "correct" ? "· AI correct" : "· AI incorrect"}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : status === "open" ? (
            <PredictionComposer battle={battle} asset={asset} signals={signals} viewerProfile={view.viewerProfile} signedIn={Boolean(viewer)} />
          ) : status === "upcoming" ? (
            <div className="card p-5">
              <p className="inline-flex items-center gap-2 font-semibold"><Clock className="size-4 text-violet" aria-hidden /> Opens <LocalTime iso={battle.opensAt} /></p>
              <p className="mt-1 text-sm text-muted">The start price is captured when the Battle opens. Come back to lock your forecast before <LocalTime iso={battle.locksAt} />.</p>
            </div>
          ) : (
            <div className="card p-5">
              <p className="inline-flex items-center gap-2 font-semibold"><Info className="size-4 text-neutral" aria-hidden /> {ended ? "You did not enter this Battle" : "Predictions are closed"}</p>
              <p className="mt-1 text-sm text-muted">{ended ? "Results below show how the crowd and AI analysts performed." : "This Battle locked. Settlement happens automatically at the end time."} <Link href="/arena" className="text-cyan hover:underline">Find the next live Battle →</Link></p>
            </div>
          )}
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          <CrowdSignal crowd={view.crowd} revealed={view.crowdRevealed} viewerDirection={mine?.direction ?? null} justRevealed={justLocked} teaserTotal={view.participantCount} reason={!viewer ? "Sign in and lock your forecast to reveal the crowd split." : undefined} />

          <section className="card p-5" aria-labelledby="ai-heading">
            <h3 id="ai-heading" className="text-sm font-semibold">AI analyst positions</h3>
            <p className="mt-1 text-xs text-muted">Rule-based simulations that locked before the deadline. Revealed under the same rule as the crowd.</p>
            {!view.aiRevealed ? (
              <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-xs text-muted">Hidden until you lock your prediction.</p>
            ) : aiWithProfiles.length === 0 ? (
              <p className="mt-4 text-xs text-muted">No AI forecasts were locked for this Battle.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {aiWithProfiles.map(({ prediction, profile }) => (
                  <AIPositionCard key={prediction.id} profile={profile!} prediction={prediction} signals={signals} viewerDirection={mine?.direction ?? null} settled={settled} />
                ))}
              </div>
            )}
          </section>

          {view.crowdRevealed && view.humanPredictions.length > 0 ? (
            <section className="card p-5" aria-labelledby="participants-heading">
              <h3 id="participants-heading" className="text-sm font-semibold">Locked Signal Cards <span className="num font-normal text-muted">({view.humanPredictions.length})</span></h3>
              <ul className="mt-3 divide-y divide-border">
                {view.humanPredictions.slice(0, 12).map((p) => {
                  const owner = view.participants.find((x) => x.id === p.userId);
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                      <Avatar name={owner?.displayName ?? "Analyst"} size="sm" />
                      <Link href={`/signal/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">{owner?.displayName ?? "Analyst"}</Link>
                      {settled ? <ResultPill result={p.result} /> : null}
                      <DirectionPill direction={p.direction} size="sm" />
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

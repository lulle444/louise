import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { buildHumansVsAi, loadArenaContext } from "@/lib/services/stats";
import { formatAccuracy, formatPercent } from "@/lib/domain/format";
import { AIProfileCard } from "@/components/arena/AIProfileCard";
import { Scoreboard } from "@/components/arena/Scoreboard";
import { AssetMark } from "@/components/arena/AssetMark";
import { TrendChart } from "@/components/charts/TrendChart";
import { PageHeader, Section } from "@/components/ui/Section";
import { DirectionPill, ResultPill } from "@/components/ui/Pills";
import { LocalTime } from "@/components/ui/LocalTime";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Humans vs AI", description: "Who reads crypto markets best? Accuracy of human analysts versus rule-based AI profiles under identical rules." };

export default async function HumansVsAiPage() {
  const repo = await getRepository();
  const ctx = await loadArenaContext(repo);
  const s = buildHumansVsAi(ctx);
  return (
    <>
      <PageHeader eyebrow="Humans vs AI" title="Who reads crypto markets best?" description={<>Human analysts, three simulated AI profiles and the crowd forecast the same Rounds. Everything below is derived from settled results. <Link href="/methodology" className="text-cyan hover:underline">How scoring works →</Link></>} />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        <Scoreboard summary={s} />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Rounds decided" value={s.battleWins.humans + s.battleWins.ai + s.battleWins.ties} hint={`Humans ${s.battleWins.humans} · AI ${s.battleWins.ai} · Ties ${s.battleWins.ties}`} />
          <StatCard label="Best-performing signal" value={s.bestSignal?.name ?? "—"} hint={s.bestSignal ? `${formatAccuracy(s.bestSignal.accuracy)} accurate across ${s.bestSignal.uses} settled human forecasts` : "Needs at least five settled uses"} accent="text-cyan" />
          <StatCard label="Human vs AI gap (30d)" value={s.human30d.accuracy !== null && s.ai30d.accuracy !== null ? formatPercent((s.human30d.accuracy - s.ai30d.accuracy) * 100, 0) : "—"} hint="Positive favours humans" accent={s.human30d.accuracy !== null && s.ai30d.accuracy !== null && s.human30d.accuracy >= s.ai30d.accuracy ? "text-cyan" : "text-violet"} />
        </div>

        <section className="card p-5" aria-labelledby="trend-heading">
          <h2 id="trend-heading" className="text-base font-semibold">Performance trend</h2>
          <p className="mb-4 text-sm text-muted">Share of correct forecasts per settled Round, humans vs the three AI profiles.</p>
          <TrendChart data={s.trend} />
        </section>

        <Section eyebrow="AI analysts" title="Three profiles, three styles" description="These are deterministic rule-based simulations built for Callscore. They are not commercial AI models and their forecasts are not financial advice." className="!px-0 !py-0">
          <div className="grid gap-4 md:grid-cols-3">
            {s.aiProfileStats.map((a) => (
              <AIProfileCard key={a.profile.id} profile={a.profile} accuracy={a.accuracy.accuracy} valid={a.accuracy.valid} streak={a.streak} rating={a.rating}>
                <ul className="mt-3 flex gap-1" aria-label={`${a.profile.name} last five results`}>
                  {a.recent.map((p) => (
                    <li key={p.id} className={`h-1.5 flex-1 rounded-full ${p.result === "correct" ? "bg-bull" : "bg-bear"}`} title={p.result} />
                  ))}
                </ul>
              </AIProfileCard>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="card overflow-hidden" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="border-b border-border px-5 py-4 text-base font-semibold">Recent Rounds</h2>
            {s.recentBattles.length === 0 ? <div className="p-5"><EmptyState title="No settled Rounds yet" /></div> : (
              <ul className="divide-y divide-border">
                {s.recentBattles.map((r) => (
                  <li key={r.battle.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <AssetMark symbol={r.asset?.symbol ?? "?"} size="sm" />
                    <Link href={`/rounds/${r.battle.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block">{r.battle.title}</span>
                      <span className="block text-xs text-muted"><LocalTime iso={r.battle.endsAt} /></span>
                    </Link>
                    <DirectionPill direction={r.battle.outcome} size="sm" />
                    <span className={`num text-xs ${r.change !== null && r.change > 0 ? "text-bull" : r.change !== null && r.change < 0 ? "text-bear" : "text-neutral"}`}>{formatPercent(r.change)}</span>
                    <span className="num w-24 text-right text-xs text-muted">H {formatAccuracy(r.humanCorrectShare)} · AI {formatAccuracy(r.aiCorrectShare)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${r.winner === "humans" ? "bg-cyan/15 text-cyan" : r.winner === "ai" ? "bg-violet/15 text-violet" : "bg-surface-2 text-muted"}`}>{r.winner === "humans" ? "Humans" : r.winner === "ai" ? "AI" : r.winner}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-5" aria-labelledby="disagree-heading">
            <h2 id="disagree-heading" className="text-base font-semibold">Biggest human/AI disagreement</h2>
            {s.biggestDisagreement ? (
              <div className="mt-3 text-sm">
                <Link href={`/rounds/${s.biggestDisagreement.battle.id}`} className="font-semibold hover:underline">{s.biggestDisagreement.battle.title}</Link>
                <p className="mt-2 text-muted">Crowd majority ({s.biggestDisagreement.crowdShare}%): <DirectionPill direction={s.biggestDisagreement.crowd} size="sm" /></p>
                <p className="mt-1 text-muted">AI majority: <DirectionPill direction={s.biggestDisagreement.ai} size="sm" /></p>
                <p className="mt-3 text-muted">Outcome: <DirectionPill direction={s.biggestDisagreement.outcome} size="sm" /> — {s.biggestDisagreement.outcome === s.biggestDisagreement.crowd ? <ResultPill result="correct" className="ml-1" /> : null} {s.biggestDisagreement.outcome === s.biggestDisagreement.crowd ? "the crowd was right" : s.biggestDisagreement.outcome === s.biggestDisagreement.ai ? "the AI was right" : "neither side called it"}.</p>
              </div>
            ) : <p className="mt-3 text-sm text-muted">Humans and AI have agreed on every settled Round so far.</p>}
            <p className="mt-6 text-xs text-muted">Methodology, void rules and data limitations are documented on the <Link href="/methodology" className="text-cyan hover:underline">methodology page</Link>.</p>
          </section>
        </div>
      </div>
    </>
  );
}

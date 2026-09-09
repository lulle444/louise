import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { getRepository } from "@/lib/data";
import { getViewer } from "@/lib/auth/session";
import { MIN_RANKED_BATTLES } from "@/lib/config";
import { buildProfileStats, loadArenaContext } from "@/lib/services/stats";
import { formatAccuracy } from "@/lib/domain/format";
import { SignalCard, toSignalCardData } from "@/components/arena/SignalCard";
import { SignalDNAChart } from "@/components/charts/SignalDNAChart";
import { BadgeGrid } from "@/components/profile/BadgeGrid";
import { Avatar } from "@/components/ui/Avatar";
import { LocalTime } from "@/components/ui/LocalTime";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { DirectionPill } from "@/components/ui/Pills";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/profile/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `@${username}`, description: `Forecasting track record of @${username} on SIGNAL ARENA.` };
}

export default async function ProfilePage(props: PageProps<"/profile/[username]">) {
  const { username } = await props.params;
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const profile = await repo.getProfileByUsername(username);
  if (!profile) notFound();
  const ctx = await loadArenaContext(repo);
  const stats = buildProfileStats(ctx, profile);
  const isOwner = viewer?.id === profile.id;
  const battleById = new Map(ctx.battles.map((b) => [b.id, b]));
  const assetById = new Map(ctx.assets.map((a) => [a.id, a]));
  const cards = stats.predictions.slice(0, 6).map((p) => {
    const battle = battleById.get(p.battleId);
    const asset = battle ? assetById.get(battle.assetId) : undefined;
    if (!battle || !asset) return null;
    return toSignalCardData({ id: p.id, kind: "human", profile, asset, battle, direction: p.direction, signalIds: p.signalIds, allSignals: ctx.signals, confidence: p.confidence, thesis: p.thesis, lockedAt: p.lockedAt, referencePrice: p.referencePrice, result: p.result, battleScore: p.battleScore, xpAwarded: p.xpAwarded });
  }).filter((c): c is NonNullable<typeof c> => c !== null);
  const dna = stats.dna;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={profile.displayName} size="xl" />
            <div>
              <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
              <p className="font-mono text-sm text-muted">@{profile.username} · joined <LocalTime iso={profile.createdAt} /></p>
              {profile.bio ? <p className="mt-2 max-w-lg text-sm text-muted">{profile.bio}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dna.style ? <span className="rounded-full border border-violet/40 bg-violet/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-violet">{dna.style}</span> : null}
            {isOwner ? <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-2"><Settings className="size-4" aria-hidden /> Edit profile</Link> : null}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Level {stats.level.level.level} · {stats.level.next ? `${stats.level.xpIntoLevel}/${stats.level.xpForLevel} XP to ${stats.level.next.name}` : "Max level"}</span>
            <span className="num">{profile.xp} XP</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-border/60" role="progressbar" aria-valuenow={Math.round(stats.level.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Level progress">
            <div className="fill-bar h-full rounded-full bg-gradient-to-r from-cyan to-violet" style={{ width: `${Math.max(2, stats.level.progress * 100)}%` }} />
          </div>
          <p className="mt-1 text-sm font-semibold">{stats.level.level.name}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Arena rating" value={stats.rating.toFixed(1)} hint={stats.ranked ? "Ranked" : `Provisional · ${MIN_RANKED_BATTLES - stats.accuracy.valid} more settled to rank`} accent="text-cyan" />
        <StatCard label="Accuracy" value={formatAccuracy(stats.accuracy.accuracy)} hint={`${stats.accuracy.correct}/${stats.accuracy.valid} correct`} />
        <StatCard label="Settled" value={stats.accuracy.valid} hint={stats.accuracy.voided ? `${stats.accuracy.voided} void excluded` : `${stats.accuracy.pending} pending`} />
        <StatCard label="Streak" value={profile.currentStreak} hint={`Longest ${profile.longestStreak}`} accent={profile.currentStreak > 0 ? "text-bull" : "text-text"} />
        <StatCard label="Best asset" value={stats.bestAsset?.symbol ?? "—"} hint={stats.bestAsset ? formatAccuracy(stats.bestAsset.accuracy) : "Needs 3+ Battles per asset"} />
        <StatCard label="Best signal" value={<span className="text-lg">{stats.bestSignal?.name ?? "—"}</span>} hint={stats.bestSignal ? formatAccuracy(stats.bestSignal.accuracy) : "Needs 3+ settled uses"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="dna-heading">
          <h2 id="dna-heading" className="text-base font-semibold">Signal DNA</h2>
          {dna.ready ? (
            <>
              <SignalDNAChart data={dna.radar} />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Style</dt><dd className="mt-0.5 text-violet">{dna.style}</dd><dd className="text-xs text-muted">{dna.styleReason}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Most used signal</dt><dd className="mt-0.5">{dna.mostUsedSignal?.name ?? "—"} <span className="num text-xs text-muted">({dna.mostUsedSignal?.uses ?? 0} uses)</span></dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Best timeframe</dt><dd className="mt-0.5">{dna.bestTimeframe}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wider text-muted">Against the crowd</dt><dd className="mt-0.5 num">{dna.contrarianRate !== null ? `${Math.round(dna.contrarianRate * 100)}%` : "—"}</dd></div>
              </dl>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted">Accuracy by direction</p>
                  <ul className="mt-1 space-y-1 text-sm">{dna.directionAccuracy.map((d) => <li key={d.direction} className="flex items-center justify-between"><DirectionPill direction={d.direction} size="sm" /><span className="num">{formatAccuracy(d.accuracy)} <span className="text-xs text-muted">({d.valid})</span></span></li>)}</ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted">Confidence calibration</p>
                  <ul className="mt-1 space-y-1 text-sm">{dna.calibration.filter((c) => c.count > 0).map((c) => <li key={c.confidence} className="flex items-center justify-between"><span className="num">Conf. {c.confidence}/5</span><span className="num">{formatAccuracy(c.accuracy)} <span className="text-xs text-muted">({c.valid})</span></span></li>)}</ul>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
              <p className="font-semibold">Building your Signal DNA</p>
              <p className="mt-1 text-sm text-muted">{dna.validSettled} of {dna.requiredSettled} settled Battles. Signal DNA is a statistical summary of forecasting-game history and needs a minimum sample before it says anything.</p>
            </div>
          )}
          <p className="mt-4 text-[11px] text-muted">Signal DNA summarises forecasting-game history. It is not proof of trading profitability.</p>
        </section>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="perf-heading">
            <h2 id="perf-heading" className="text-base font-semibold">Performance by asset and signal</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <table className="w-full text-sm"><caption className="mb-1 text-left text-[11px] uppercase tracking-wider text-muted">By asset</caption><tbody>
                {dna.assetPerformance.length === 0 ? <tr><td className="text-muted">No settled Battles</td></tr> : dna.assetPerformance.map((a) => <tr key={a.assetId} className="border-t border-border/60"><td className="num py-1.5">{a.symbol}</td><td className="num py-1.5 text-right">{formatAccuracy(a.accuracy)}</td><td className="num py-1.5 text-right text-xs text-muted">{a.correct}/{a.valid}</td></tr>)}
              </tbody></table>
              <table className="w-full text-sm"><caption className="mb-1 text-left text-[11px] uppercase tracking-wider text-muted">By selected signal</caption><tbody>
                {dna.signalUsage.length === 0 ? <tr><td className="text-muted">No signals cited yet</td></tr> : dna.signalUsage.map((u) => <tr key={u.signalId} className="border-t border-border/60"><td className="py-1.5">{u.name}</td><td className="num py-1.5 text-right">{formatAccuracy(u.accuracy)}</td><td className="num py-1.5 text-right text-xs text-muted">{u.correct}/{u.valid}</td></tr>)}
              </tbody></table>
            </div>
          </section>
          <section className="card p-5" aria-labelledby="badges-heading">
            <h2 id="badges-heading" className="text-base font-semibold">Badges <span className="num text-sm font-normal text-muted">{stats.badges.length}/{ctx.badges.length}</span></h2>
            <p className="mb-3 text-xs text-muted">Cosmetic and reputational only.</p>
            <BadgeGrid earned={stats.badges} all={ctx.badges} />
          </section>
        </div>
      </div>

      <section className="mt-6" aria-labelledby="history-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="history-heading" className="text-base font-semibold">Signal Cards <span className="num text-sm font-normal text-muted">({stats.predictions.length})</span></h2>
        </div>
        {cards.length === 0 ? (
          <EmptyState title="No forecasts yet" description={isOwner ? "Enter today’s Battle to lock your first Signal Card." : "This analyst has not locked a forecast yet."} action={isOwner ? { href: "/arena", label: "Enter a Battle" } : undefined} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map((c) => <Link key={c.id} href={`/signal/${c.id}`} className="block rounded-[14px] focus-visible:outline-cyan"><SignalCard data={c} showLink={false} className="card-hover h-full" /></Link>)}</div>
        )}
        {stats.predictions.length > cards.length ? <p className="mt-3 text-xs text-muted">Showing the {cards.length} most recent of {stats.predictions.length}.</p> : null}
      </section>
      <p className="mt-8 text-xs text-muted">This track record is forecasting-game history using virtual points. It is not verified investment performance and does not predict future results.</p>
    </div>
  );
}

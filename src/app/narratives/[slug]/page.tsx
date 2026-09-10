import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge } from "@/components/DemoBadge";
import { MethodologyTooltip } from "@/components/MethodologyTooltip";
import { NarrativeIcon } from "@/components/NarrativeIcon";
import { RankMove } from "@/components/RankMove";
import { ScoreHistoryChart } from "@/components/ScoreHistoryChart";
import { Stat } from "@/components/Stat";
import { StatusPill } from "@/components/StatusPill";
import { getSession } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatPct } from "@/lib/format";
import { getNarrativeHistory } from "@/lib/services/views";
import { groupSnapshots, latestRaceSnapshot, snapshotOfKind } from "@/lib/services/snapshots";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { store } = await getSession();
  const n = await store.getNarrativeBySlug(slug);
  return { title: n ? n.name : "Narrative" };
}

export default async function NarrativePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  const { store } = session;
  const narrative = await store.getNarrativeBySlug(slug);
  if (!narrative) notFound();
  const version = await store.getConstituentVersion(narrative.currentConstituentVersionId);
  const versions = await store.listConstituentVersions(narrative.id);
  const races = await store.listRaces();
  const current = races.find((r) => r.status === "live") ?? races.find((r) => r.status === "published") ?? null;
  const snapshots = current ? await store.listSnapshots(current.id) : [];
  const latestSet = current?.status === "published" ? snapshotOfKind(snapshots, "prelock") : latestRaceSnapshot(snapshots);
  const latest = latestSet.find((s) => s.narrativeId === narrative.id) ?? null;
  const previous = groupSnapshots(snapshots).filter((g) => g.kind !== "reference").slice(-2)[0]?.rows.find((s) => s.narrativeId === narrative.id) ?? null;
  const history = await getNarrativeHistory(session, narrative.id);
  const chart = groupSnapshots(snapshots)
    .filter((g) => g.kind !== "reference")
    .map((g) => {
      const s = g.rows.find((r) => r.narrativeId === narrative.id);
      return { label: formatDateTime(g.takenAt).replace(" UTC", ""), score: s?.score ?? 0, price: s?.normalized.price ?? 0, breadth: s?.normalized.breadth ?? 0, momentum: s?.normalized.momentum ?? 0 };
    });

  return (
    <div className="space-y-8 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/narratives" className="hover:text-ink">Narratives</Link> / <span className="text-ink">{narrative.name}</span>
      </nav>
      <header className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl" style={{ background: `${narrative.accentColor}22`, color: narrative.accentColor }}>
          <NarrativeIcon name={narrative.icon} className="h-7 w-7" />
        </span>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{narrative.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{narrative.description}</p>
        </div>
        {current?.isDemo ? <DemoBadge /> : null}
        {!narrative.active ? <StatusPill status="archived" /> : null}
      </header>

      {latest ? (
        <section aria-labelledby="metrics-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 id="metrics-heading" className="text-lg font-semibold">
              Current components{current ? ` · ${current.name}` : ""}
            </h2>
            <MethodologyTooltip label="components" anchor="narrative-score">Each component is normalized 0–100 with documented bounds before weighting.</MethodologyTooltip>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Rank" value={<span className="flex items-center gap-2">#{latest.rank} <RankMove from={previous?.rank ?? null} to={latest.rank} /></span>} hint={`score ${latest.score.toFixed(1)}`} accent={narrative.accentColor} />
            <Stat label="Price (40%)" value={latest.normalized.price.toFixed(0)} hint={formatPct(latest.raw.priceChangePct)} />
            <Stat label="Breadth (25%)" value={latest.normalized.breadth.toFixed(0)} hint={`${Math.round(latest.raw.breadthShare * 100)}% of assets up`} />
            <Stat label="Volume (20%)" value={latest.normalized.volume.toFixed(0)} hint={`${formatPct(latest.raw.volumeChangePct, 0)} vs prior window`} />
            <Stat label="Momentum (15%)" value={latest.normalized.momentum.toFixed(0)} hint={`${Math.round(latest.raw.momentumConsistency * 100)}% up-intervals`} />
          </div>
          <p className="text-xs text-dim">
            Source: {latest.source} · taken {formatDateTime(latest.takenAt)} · constituents {version?.version ? `v${version.version}` : "—"} · formula {latest.formulaVersion}
            {latest.quality === "unavailable" ? " · data unavailable for this snapshot" : ""}
          </p>
        </section>
      ) : (
        <p className="card p-5 text-sm text-muted">No snapshot yet for this narrative.</p>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Performance in the current Race</h2>
          {chart.length > 1 ? (
            <ScoreHistoryChart
              data={chart}
              series={[
                { key: "score", label: "Narrative Score", color: narrative.accentColor },
                { key: "price", label: "Price", color: "#94A3B8" },
                { key: "breadth", label: "Breadth", color: "#22D3EE" },
                { key: "momentum", label: "Momentum", color: "#8B5CF6" },
              ]}
            />
          ) : (
            <p className="text-sm text-muted">The chart fills in once interval snapshots are recorded.</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Constituents</h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Asset</th>
                <th scope="col">Symbol</th>
                <th scope="col">Weight</th>
              </tr>
            </thead>
            <tbody>
              {version?.constituents.map((c) => (
                <tr key={c.assetId}>
                  <td>{c.name}</td>
                  <td className="mono">{c.symbol}</td>
                  <td className="mono">{Math.round(c.weight * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-dim">
            Version {version?.version} · {version?.note} · {versions.length} version{versions.length === 1 ? "" : "s"} recorded. Constituents never change during a live Race.
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Race history</h2>
        {history.length ? (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Race</th>
                <th scope="col">Status</th>
                <th scope="col">Start rank</th>
                <th scope="col">Finish</th>
                <th scope="col">Move</th>
                <th scope="col">Final score</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.race.id}>
                  <td>
                    <Link href={`/race/${h.race.id}`} className="hover:underline">{h.race.name}</Link>
                    <span className="block text-xs text-dim">{formatDate(h.race.startsAt)}</span>
                  </td>
                  <td><StatusPill status={h.race.status} /></td>
                  <td className="mono">{h.startRank ?? "—"}</td>
                  <td className="mono">{h.finishRank ?? "—"}</td>
                  <td>{h.finishRank !== null ? <RankMove from={h.startRank} to={h.finishRank} /> : "—"}</td>
                  <td className="mono">{h.finalScore?.toFixed(1) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">No Race history yet.</p>
        )}
      </section>

      <section className="card p-5 text-sm text-muted">
        <h2 className="mb-2 text-lg font-semibold text-ink">Methodology note</h2>
        <p>
          The Narrative Score is a transparent composite: price performance 40%, market breadth 25%, volume change 20%, momentum consistency 15%. Constituents use capped equal weighting (max 35% per asset) to avoid market-cap distortion. If fewer than 60% of constituents have usable data the narrative is marked unavailable rather than estimated.{" "}
          <Link href="/methodology" className="text-cyan hover:underline">Read the full methodology.</Link>
        </p>
      </section>
    </div>
  );
}

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { latestRaceSnapshot, snapshotOfKind } from "@/lib/services/snapshots";

/** Scrolling tape of narrative scores for the live Race. CSS marquee; static under reduced motion. */
export async function LiveTicker() {
  const { store } = await getSession();
  const races = await store.listRaces();
  const live = races.find((r) => r.status === "live");
  if (!live) return null;
  const [snapshots, narratives] = await Promise.all([store.listSnapshots(live.id), store.listNarratives()]);
  const latest = latestRaceSnapshot(snapshots);
  const start = new Map(snapshotOfKind(snapshots, "prelock").map((s) => [s.narrativeId, s]));
  if (!latest.length) return null;
  const items = [...latest]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const n = narratives.find((x) => x.id === s.narrativeId);
      const from = start.get(s.narrativeId);
      return { id: s.narrativeId, slug: n?.slug ?? "", name: n?.shortName ?? "?", color: n?.accentColor ?? "#94A3B8", rank: s.rank, score: s.score, move: from ? from.rank - s.rank : 0, delta: from ? s.score - from.score : 0 };
    });
  const tape = [...items, ...items];
  return (
    <div className="ticker border-b border-border bg-surface/70" aria-label={`Live standings for ${live.name}`}>
      <div className="mx-auto flex max-w-7xl items-center">
        <Link href={`/race/${live.id}`} className="flex shrink-0 items-center gap-2 border-r border-border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-cyan sm:px-4">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan" aria-hidden="true" />
          Live
        </Link>
        <div className="ticker-viewport flex-1 overflow-hidden">
          <ul className="ticker-tape">
            {tape.map((it, i) => (
              <li key={`${it.id}-${i}`} aria-hidden={i >= items.length} className="flex shrink-0 items-center gap-2 px-4 py-1.5 font-mono text-xs">
                <span className="text-dim">{it.rank}</span>
                <Link href={`/narratives/${it.slug}`} className="font-semibold hover:underline" style={{ color: it.color }}>
                  {it.name}
                </Link>
                <span className="text-ink">{it.score.toFixed(1)}</span>
                <span className={`inline-flex items-center gap-0.5 ${it.move > 0 ? "text-up" : it.move < 0 ? "text-coral" : "text-dim"}`}>
                  {it.move > 0 ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : it.move < 0 ? <ArrowDown className="h-3 w-3" aria-hidden="true" /> : <Minus className="h-3 w-3" aria-hidden="true" />}
                  {it.move > 0 ? `+${it.move}` : it.move}
                </span>
                <span className="text-dim">{it.delta >= 0 ? "+" : ""}{it.delta.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

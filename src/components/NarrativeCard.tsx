import Link from "next/link";
import type { Narrative, NarrativeSnapshot } from "@/lib/types";
import { formatPct } from "@/lib/format";
import { NarrativeIcon } from "./NarrativeIcon";
import { RankMove } from "./RankMove";
import { Sparkline } from "./Sparkline";

export function NarrativeCard({
  narrative,
  snapshot,
  previousRank,
  href,
  footer,
  series,
}: {
  narrative: Narrative;
  snapshot: NarrativeSnapshot | null;
  previousRank?: number | null;
  href?: string;
  footer?: React.ReactNode;
  /** Score history for a sparkline. */
  series?: number[];
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${narrative.accentColor}22`, color: narrative.accentColor }}>
            <NarrativeIcon name={narrative.icon} className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">{narrative.name}</p>
            {snapshot ? (
              <p className="mono text-xs text-muted">
                #{snapshot.rank} · {snapshot.score.toFixed(1)}
              </p>
            ) : (
              <p className="text-xs text-dim">No snapshot</p>
            )}
          </div>
        </div>
        <span className="flex items-center gap-2">
          {series && series.length > 1 ? <Sparkline values={series} color={narrative.accentColor} /> : null}
          {snapshot && previousRank !== undefined ? <RankMove from={previousRank ?? null} to={snapshot.rank} /> : null}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-xs text-muted">{narrative.description}</p>
      {snapshot ? (
        <dl className="mt-3 grid grid-cols-4 gap-1 text-center">
          {[
            ["Price", snapshot.normalized.price, formatPct(snapshot.raw.priceChangePct)],
            ["Breadth", snapshot.normalized.breadth, `${Math.round(snapshot.raw.breadthShare * 100)}% up`],
            ["Volume", snapshot.normalized.volume, formatPct(snapshot.raw.volumeChangePct, 0)],
            ["Momentum", snapshot.normalized.momentum, `${Math.round(snapshot.raw.momentumConsistency * 100)}%`],
          ].map(([label, norm, raw]) => (
            <div key={label as string} className="rounded-md bg-bg/60 px-1 py-1.5">
              <dt className="font-mono text-[0.55rem] uppercase tracking-wider text-dim">{label}</dt>
              <dd className="mono text-xs font-semibold">{(norm as number).toFixed(0)}</dd>
              <dd className="text-[0.6rem] text-dim">{raw as string}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {footer}
    </>
  );
  const cls = "card block h-full p-4 transition hover:border-cyan/50";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

import Link from "next/link";
import type { Narrative } from "@/lib/types";
import { NarrativeIcon } from "./NarrativeIcon";

/** Narrative "market" card: icon + name on top, big score and change with an area sparkline below. */
export function MarketCard({
  narrative,
  score,
  delta7d,
  deltaLast,
  series,
  rank,
}: {
  narrative: Narrative;
  score: number;
  delta7d: number;
  deltaLast: number;
  series: number[];
  rank: number;
}) {
  const up = delta7d >= 0;
  const color = up ? "#34D399" : "#FB7185";
  const w = 180;
  const h = 56;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const pts = series.map((v, i) => [i * step, h - 4 - ((v - min) / span) * (h - 8)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const gradId = `mk-${narrative.id}`;
  const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;
  return (
    <Link href={`/narratives/${narrative.slug}`} className="card block p-5 transition hover:border-primary/50" data-testid="market-card">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border" style={{ background: `${narrative.accentColor}18`, borderColor: `${narrative.accentColor}55`, color: narrative.accentColor }}>
          <NarrativeIcon name={narrative.icon} className="h-5 w-5" />
        </span>
        <p className="min-w-0 flex-1 truncate font-semibold">
          {narrative.name} <span className="font-mono text-xs font-medium text-muted">{narrative.shortName}</span>
        </p>
        <span className="mono text-xs text-muted">#{rank}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="mono text-3xl font-bold leading-none">{score.toFixed(1)}</p>
          <p className="mono mt-2 text-xs" style={{ color }}>
            {signed(deltaLast)} last · {signed(delta7d)} race
          </p>
        </div>
        {series.length > 1 ? (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="h-14 w-32 shrink-0 sm:w-40" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <polygon points={area} fill={`url(#${gradId})`} />
            <polyline points={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="sparkline-line" />
          </svg>
        ) : null}
      </div>
    </Link>
  );
}

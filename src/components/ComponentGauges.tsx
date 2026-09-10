import type { NarrativeSnapshot } from "@/lib/types";
import { NARRATIVE_WEIGHTS } from "@/lib/scoring/narrative-score";
import { formatPct } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

const GAUGES = [
  { key: "price", label: "Price", weight: NARRATIVE_WEIGHTS.price, color: "#B6F36B" },
  { key: "breadth", label: "Breadth", weight: NARRATIVE_WEIGHTS.breadth, color: "#22D3EE" },
  { key: "volume", label: "Volume", weight: NARRATIVE_WEIGHTS.volume, color: "#F59E0B" },
  { key: "momentum", label: "Momentum", weight: NARRATIVE_WEIGHTS.momentum, color: "#8B5CF6" },
] as const;

/** Four animated arcs, one per Narrative Score component, with raw values beneath. */
export function ComponentGauges({ snapshot }: { snapshot: NarrativeSnapshot }) {
  const raw = {
    price: formatPct(snapshot.raw.priceChangePct),
    breadth: `${Math.round(snapshot.raw.breadthShare * 100)}% of assets up`,
    volume: `${formatPct(snapshot.raw.volumeChangePct, 0)} vs prior window`,
    momentum: `${Math.round(snapshot.raw.momentumConsistency * 100)}% up-intervals`,
  };
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {GAUGES.map((g, i) => {
        const v = snapshot.normalized[g.key] / 100;
        return (
          <li key={g.key} className="card-2 flex flex-col items-center px-3 py-4 text-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E293B" strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={g.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - v)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="arc-in"
                style={{ ["--arc-c" as string]: c, ["--arc-o" as string]: c * (1 - v), animationDelay: `${i * 120}ms` }}
              />
              <foreignObject x="0" y="0" width={size} height={size}>
                <div className="flex h-full items-center justify-center">
                  <AnimatedNumber value={snapshot.normalized[g.key]} className="text-xl font-semibold" duration={1200} />
                </div>
              </foreignObject>
            </svg>
            <p className="mt-1 text-sm font-semibold">
              {g.label} <span className="text-xs font-normal text-muted">({Math.round(g.weight * 100)}%)</span>
            </p>
            <p className="text-xs text-muted">{raw[g.key]}</p>
          </li>
        );
      })}
    </ul>
  );
}

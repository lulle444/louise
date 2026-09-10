"use client";

import type { MetaDNA } from "@/lib/types";

/** Hand-drawn SVG radar (no charting library). The polygon scales in from the centre via CSS. */
export function MetaDNAChart({ dna, size = 220 }: { dna: MetaDNA; size?: number }) {
  if (!dna.ready) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted" style={{ height: size }} data-testid="dna-building">
        <div>
          <p className="font-semibold text-ink">Building your Meta DNA</p>
          <p className="mt-1 text-xs">{dna.sampleSize}/3 settled Races. Profiles need at least three.</p>
        </div>
      </div>
    );
  }
  const axes = dna.axes;
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, v: number) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v] as const;
  const ring = (v: number) => axes.map((_, i) => point(i, v).join(",")).join(" ");
  const shape = axes.map((a, i) => point(i, Math.max(0, Math.min(100, a.value)) / 100).join(",")).join(" ");
  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Meta DNA radar: ${axes.map((a) => `${a.label} ${a.value}`).join(", ")}`} data-testid="dna-chart">
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} points={ring(v)} fill="none" stroke="#1E293B" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1E293B" strokeWidth={1} />;
      })}
      <polygon points={shape} fill="#B6F36B" fillOpacity={0.25} stroke="#B6F36B" strokeWidth={2} strokeLinejoin="round" className="radar-shape" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      {axes.map((a, i) => {
        const [x, y] = point(i, a.value / 100);
        return <circle key={a.key} cx={x} cy={y} r={3} fill="#B6F36B" className="radar-shape" style={{ transformOrigin: `${cx}px ${cy}px` }} />;
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, 1.22);
        const anchor = Math.abs(x - cx) < 4 ? "middle" : x < cx ? "end" : "start";
        return (
          <text key={a.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fill="#94A3B8" fontSize={10} fontFamily="ui-sans-serif, system-ui, sans-serif">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

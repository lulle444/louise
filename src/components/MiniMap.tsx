/** Tiny multi-line map of the top narratives' scores over a Race. Lines draw in on mount. */
export function MiniMap({
  series,
  width = 220,
  height = 56,
}: {
  series: { id: string; label: string; color: string; values: number[] }[];
  width?: number;
  height?: number;
}) {
  const all = series.flatMap((s) => s.values);
  if (!all.length || series.every((s) => s.values.length < 2)) return null;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const n = Math.max(...series.map((s) => s.values.length));
  const step = width / Math.max(1, n - 1);
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  return (
    <div className="minimap">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label={`Score paths for ${series.map((s) => s.label).join(", ")}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={width} y1={height * g} y2={height * g} stroke="#1E293B" strokeDasharray="2 4" />
        ))}
        {series.map((s, i) => (
          <polyline
            key={s.id}
            points={s.values.map((v, j) => `${(j * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={i === 0 ? 2 : 1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            className="sparkline-line"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5" aria-hidden="true">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1 font-mono text-[0.6rem] text-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

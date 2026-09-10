/** Circular progress arc (0–1). Animates in via the `arc-in` keyframe. */
export function ProgressArc({
  value,
  size = 84,
  stroke = 7,
  color = "#22D3EE",
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  sublabel?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E293B" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="arc-in"
          style={{ ["--arc-c" as string]: c, ["--arc-o" as string]: c * (1 - v) }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#F1F5F9" fontSize={size * 0.22} fontWeight={600} fontFamily="ui-monospace, monospace">
          {Math.round(v * 100)}%
        </text>
      </svg>
      <div>
        <p className="eyebrow">{label}</p>
        {sublabel ? <p className="text-xs text-muted">{sublabel}</p> : null}
      </div>
    </div>
  );
}

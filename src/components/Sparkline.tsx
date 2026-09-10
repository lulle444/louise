/** Tiny inline SVG line that draws itself in on mount (CSS `draw` keyframe). */
export function Sparkline({
  values,
  color,
  width = 96,
  height = 28,
  className = "",
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`);
  const last = points[points.length - 1].split(",");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`sparkline ${className}`}
      role="img"
      aria-label={`Trend ${up ? "up" : "down"} from ${values[0].toFixed(1)} to ${values[values.length - 1].toFixed(1)}`}
    >
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" pathLength={1} />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} className="sparkline-dot" />
    </svg>
  );
}

import type { PricePoint } from "@/lib/market/provider";

/** Server-rendered inline SVG sparkline; no client JS. */
export function Sparkline({ series, width = 160, height = 44, positive = true, className = "" }: { series: PricePoint[]; width?: number; height?: number; positive?: boolean; className?: string }) {
  if (series.length < 2) return <div className={`h-[44px] ${className}`} />;
  const prices = series.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || max * 0.001 || 1;
  const pad = 3;
  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (p - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`;
  const color = positive ? "#34D399" : "#FB7185";
  const id = `sp-${Math.round(min)}-${prices.length}-${positive ? "u" : "d"}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

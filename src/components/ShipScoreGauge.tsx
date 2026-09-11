import { scoreBand } from "@/lib/domain/score";
import { cn } from "@/components/ui";

const BAND_COLOR = {
  high: "#49d6a3",
  solid: "#5b8cff",
  mixed: "#f2b84b",
  low: "#f2737a",
  insufficient: "#5f6b7d",
} as const;

/**
 * Score ring. Renders "Insufficient data" instead of a misleading number when
 * the minimum data threshold is not met.
 */
export function ShipScoreGauge({ total, size = 96, label = "Ship Score", className }: { total: number | null; size?: number; label?: string; className?: string }) {
  const band = scoreBand(total);
  const color = BAND_COLOR[band];
  const stroke = Math.max(6, size / 12);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total === null ? 0 : (total / 100) * circumference;
  const fontSize = size >= 96 ? "text-2xl" : size >= 64 ? "text-lg" : "text-sm";
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} role="img" aria-label={total === null ? `${label}: insufficient data` : `${label} ${total} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#253041" strokeWidth={stroke} />
        {total !== null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : (
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray="3 6" opacity={0.6} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {total === null ? (
          <span className="px-1 text-center font-mono text-[10px] uppercase tracking-wider text-slate">Insufficient data</span>
        ) : (
          <>
            <span className={cn("font-semibold tabular-nums text-ink", fontSize)}>{total}</span>
            {size >= 80 ? <span className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate">/ 100</span> : null}
          </>
        )}
      </div>
    </div>
  );
}

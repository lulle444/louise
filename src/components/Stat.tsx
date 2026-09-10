import { AnimatedNumber } from "./AnimatedNumber";

export function Stat({
  label,
  value,
  hint,
  accent,
  animate,
}: {
  label: string;
  value?: React.ReactNode;
  hint?: string;
  accent?: string;
  /** Count the number up on mount instead of rendering `value`. */
  animate?: { value: number; decimals?: number; prefix?: string; suffix?: string };
}) {
  return (
    <div className="card-2 px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mono mt-1 text-xl font-semibold" style={accent ? { color: accent } : undefined}>
        {animate ? <AnimatedNumber value={animate.value} decimals={animate.decimals} prefix={animate.prefix} suffix={animate.suffix} /> : value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

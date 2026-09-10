import { ArrowDown, ArrowUp, Minus } from "lucide-react";

/** Movement indicator that never relies on color alone: icon + signed number + label. */
export function RankMove({ from, to, className = "" }: { from: number | null; to: number; className?: string }) {
  if (from === null) return <span className={`text-dim ${className}`}>—</span>;
  const diff = from - to;
  if (diff === 0) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-xs text-muted ${className}`} aria-label="No change">
        <Minus className="h-3 w-3" aria-hidden="true" />0
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${up ? "text-up" : "text-coral"} ${className}`}
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "position" : "positions"}`}
    >
      {up ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />}
      {up ? "+" : "−"}
      {Math.abs(diff)}
    </span>
  );
}

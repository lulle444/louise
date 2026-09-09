import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { BattleStatus, Direction, PredictionResult } from "@/lib/domain/types";
import { directionLabel } from "@/lib/domain/format";

export const DIRECTION_META: Record<Direction, { label: string; color: string; bg: string; border: string; Icon: typeof ArrowUpRight }> = {
  bullish: { label: "Bullish", color: "text-bull", bg: "bg-bull/10", border: "border-bull/40", Icon: ArrowUpRight },
  neutral: { label: "Neutral", color: "text-neutral", bg: "bg-neutral/10", border: "border-neutral/40", Icon: Minus },
  bearish: { label: "Bearish", color: "text-bear", bg: "bg-bear/10", border: "border-bear/40", Icon: ArrowDownRight },
};

export function DirectionPill({ direction, size = "md", className = "" }: { direction: Direction | null; size?: "sm" | "md" | "lg"; className?: string }) {
  if (!direction) return <span className={`rounded-full border border-border px-2 py-0.5 text-xs text-muted ${className}`}>—</span>;
  const m = DIRECTION_META[direction];
  const sz = size === "sm" ? "px-2 py-0.5 text-[11px]" : size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-mono font-semibold uppercase tracking-wider ${m.color} ${m.bg} ${m.border} ${sz} ${className}`}>
      <m.Icon className="size-3.5" aria-hidden />
      {directionLabel(direction)}
    </span>
  );
}

const STATUS_META: Record<BattleStatus, { label: string; cls: string; dot: string }> = {
  draft: { label: "Draft", cls: "border-border text-muted", dot: "bg-dim" },
  upcoming: { label: "Upcoming", cls: "border-violet/40 text-violet", dot: "bg-violet" },
  open: { label: "Live", cls: "border-cyan/40 text-cyan", dot: "bg-cyan signal-pulse" },
  locked: { label: "Locked", cls: "border-neutral/40 text-neutral", dot: "bg-neutral" },
  settling: { label: "Settling", cls: "border-neutral/40 text-neutral", dot: "bg-neutral signal-pulse" },
  settled: { label: "Settled", cls: "border-bull/40 text-bull", dot: "bg-bull" },
  void: { label: "Void", cls: "border-bear/40 text-bear", dot: "bg-bear" },
  archived: { label: "Archived", cls: "border-border text-muted", dot: "bg-dim" },
};

export function StatusPill({ status, className = "" }: { status: BattleStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border bg-surface-2/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${m.cls} ${className}`}>
      <span className={`size-1.5 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}

export function ResultPill({ result, className = "" }: { result: PredictionResult; className?: string }) {
  const map: Record<PredictionResult, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "border-border text-muted" },
    correct: { label: "Correct", cls: "border-bull/50 bg-bull/10 text-bull" },
    incorrect: { label: "Incorrect", cls: "border-bear/50 bg-bear/10 text-bear" },
    void: { label: "Void", cls: "border-neutral/50 bg-neutral/10 text-neutral" },
  };
  const m = map[result];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider ${m.cls} ${className}`}>{m.label}</span>;
}

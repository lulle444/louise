import type { RaceStatus } from "@/lib/types";

const STYLES: Record<RaceStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "border-border text-muted" },
  published: { label: "Open for lineups", cls: "border-lime/40 bg-lime/10 text-lime" },
  live: { label: "Live", cls: "border-cyan/40 bg-cyan/10 text-cyan" },
  settled: { label: "Settled", cls: "border-violet/40 bg-violet/10 text-violet" },
  void: { label: "Void", cls: "border-coral/40 bg-coral/10 text-coral" },
  archived: { label: "Archived", cls: "border-border text-dim" },
};

export function StatusPill({ status, className = "" }: { status: RaceStatus; className?: string }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] ${s.cls} ${className}`}>
      {status === "live" ? <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan" aria-hidden="true" /> : null}
      {s.label}
    </span>
  );
}

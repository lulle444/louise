import { FlaskConical } from "lucide-react";

export function DemoBadge({ label = "Demo data", className = "" }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-amber ${className}`}
      title="Deterministic demo data — not live market data"
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

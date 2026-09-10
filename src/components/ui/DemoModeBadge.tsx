import { FlaskConical } from "lucide-react";

export function DemoModeBadge({ className = "", short = false }: { className?: string; short?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted ${className}`}
      title="Preview season: seeded analysts and a simulated market. Nothing here is live market data. Season 1 launches with live prices."
    >
      <FlaskConical className="size-3" aria-hidden /> {short ? "Preview season" : "Preview season · simulated market"}
    </span>
  );
}

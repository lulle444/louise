import { FlaskConical } from "lucide-react";

export function DemoModeBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-neutral/40 bg-neutral/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral ${className}`}
      title="Demo Mode: seeded data and simulated prices. Nothing here is live market data."
    >
      <FlaskConical className="size-3" aria-hidden /> Demo data
    </span>
  );
}

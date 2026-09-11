import { FlaskConical } from "lucide-react";
import { cn } from "@/components/ui";

export function DemoBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md border border-amber/40 bg-amber-soft px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-amber whitespace-nowrap", className)}
      title="Demo Mode: all projects, people and events shown are fictional."
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      {compact ? "Demo" : "Demo Mode · fictional data"}
    </span>
  );
}

export function DemoBanner() {
  return (
    <div className="border-b border-amber/30 bg-amber-soft/60 px-4 py-2 text-center text-xs text-amber">
      <strong className="font-semibold">Demo Mode.</strong> Every project, contributor, source and event on this site is fictional and generated for demonstration. Nothing here describes a real crypto project.
    </div>
  );
}

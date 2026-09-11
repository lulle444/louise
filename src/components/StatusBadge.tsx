import { CheckCircle2, CircleDashed, CircleDot, Clock3, HelpCircle, Hourglass, ScanSearch, Slash, XCircle } from "lucide-react";
import { STATUS_DESCRIPTIONS, STATUS_LABELS } from "@/lib/domain/status";
import type { MilestoneStatus } from "@/lib/domain/types";
import { cn } from "@/components/ui";

export const STATUS_TONES: Record<MilestoneStatus, string> = {
  planned: "text-slate border-border bg-surface-2",
  in_progress: "text-primary border-primary/40 bg-primary-soft",
  submitted_for_review: "text-violet border-violet/40 bg-violet-soft",
  shipped: "text-mint border-mint/40 bg-mint-soft",
  partially_shipped: "text-mint border-mint/30 bg-mint-soft/60",
  delayed: "text-amber border-amber/40 bg-amber-soft",
  no_evidence: "text-coral border-coral/40 bg-coral-soft",
  cancelled: "text-slate border-border-strong bg-surface-2",
  disputed: "text-violet border-violet/40 bg-violet-soft",
};

const ICONS: Record<MilestoneStatus, typeof CheckCircle2> = {
  planned: CircleDashed,
  in_progress: CircleDot,
  submitted_for_review: ScanSearch,
  shipped: CheckCircle2,
  partially_shipped: Hourglass,
  delayed: Clock3,
  no_evidence: XCircle,
  cancelled: Slash,
  disputed: HelpCircle,
};

export function StatusBadge({ status, size = "sm", className }: { status: MilestoneStatus; size?: "sm" | "md"; className?: string }) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        STATUS_TONES[status],
        className,
      )}
      title={STATUS_DESCRIPTIONS[status]}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

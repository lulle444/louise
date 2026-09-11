import { RefreshCw } from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/components/ui";

export function DataFreshness({ checkedAt, label = "Data last checked", className }: { checkedAt: string | null | undefined; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs text-slate", className)} title={checkedAt ? formatDateTime(checkedAt) : undefined}>
      <RefreshCw className="h-3 w-3" aria-hidden="true" />
      {label} {checkedAt ? formatRelative(checkedAt) : "—"}
    </span>
  );
}

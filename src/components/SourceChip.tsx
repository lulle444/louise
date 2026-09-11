import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { SAFE_EXTERNAL_LINK_PROPS, hostOf } from "@/lib/domain/url";
import { formatDate } from "@/lib/format";
import { cn } from "@/components/ui";

/**
 * Compact external source link with host label and optional access date.
 * Always rendered with safe external-link attributes.
 */
export function SourceChip({ url, label, accessedAt, className }: { url: string; label?: string; accessedAt?: string | null; className?: string }) {
  return (
    <a
      href={url}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 font-mono text-xs text-slate hover:border-primary hover:text-ink",
        className,
      )}
      {...SAFE_EXTERNAL_LINK_PROPS}
    >
      <ExternalLinkIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label ?? hostOf(url)}</span>
      {accessedAt ? <span className="shrink-0 text-slate-dim">· accessed {formatDate(accessedAt)}</span> : null}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

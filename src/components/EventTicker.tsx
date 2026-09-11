import Link from "next/link";
import type { FeedEvent, Project } from "@/lib/domain/types";
import { formatRelative } from "@/lib/format";
import { FEED_TYPE_META } from "./ShippingFeed";
import { cn } from "@/components/ui";

/** Horizontal ticker of the latest verified events. Pauses on hover; static under reduced motion. */
export function EventTicker({ events, projects }: { events: FeedEvent[]; projects: Map<string, Project> }) {
  if (events.length === 0) return null;
  const items = [...events, ...events];
  return (
    <div className="ticker card overflow-hidden px-0 py-2" aria-label="Latest verified events">
      <div className="ticker__track">
        {items.map((e, i) => {
          const p = projects.get(e.projectId);
          const meta = FEED_TYPE_META[e.type];
          return (
            <Link
              key={`${e.id}-${i}`}
              href={p && e.milestoneId ? `/projects/${p.slug}/milestones/${e.milestoneId}` : "/shipping-feed"}
              className="mx-4 inline-flex shrink-0 items-center gap-2 text-sm text-slate hover:text-ink"
              aria-hidden={i >= events.length}
              tabIndex={i >= events.length ? -1 : 0}
            >
              <span className={cn("stamp", meta.tone)}>{meta.label}</span>
              <span className="font-medium text-ink">{p?.name}</span>
              <span className="max-w-[28ch] truncate">{e.title.replace(/^[^:]+:\s*/, "")}</span>
              <span className="font-mono text-xs text-slate-dim">{formatRelative(e.occurredAt)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

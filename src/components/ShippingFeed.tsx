import Link from "next/link";
import { AlertCircle, BadgeCheck, CalendarClock, CheckCircle2, Clock3, FilePlus2, Hourglass, Scale, Slash } from "lucide-react";
import type { FeedEvent, FeedEventType, Project } from "@/lib/domain/types";
import { formatDateTime, formatRelative } from "@/lib/format";
import { SourceChip } from "./SourceChip";
import { EmptyState, cn } from "@/components/ui";

export const FEED_TYPE_META: Record<FeedEventType, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  shipped: { label: "Shipped", tone: "text-mint", Icon: CheckCircle2 },
  partially_shipped: { label: "Partially shipped", tone: "text-mint", Icon: Hourglass },
  delayed: { label: "Delayed", tone: "text-amber", Icon: Clock3 },
  no_evidence: { label: "No evidence", tone: "text-coral", Icon: AlertCircle },
  new_commitment: { label: "New commitment", tone: "text-primary", Icon: FilePlus2 },
  deadline_changed: { label: "Deadline changed", tone: "text-amber", Icon: CalendarClock },
  evidence_added: { label: "Evidence added", tone: "text-violet", Icon: BadgeCheck },
  dispute_resolved: { label: "Dispute resolved", tone: "text-violet", Icon: Scale },
  cancelled: { label: "Cancelled", tone: "text-slate", Icon: Slash },
};

export function ShippingFeed({ events, projects, emptyMessage = "No events match these filters." }: { events: FeedEvent[]; projects: Map<string, Project>; emptyMessage?: string }) {
  if (events.length === 0) return <EmptyState title="Nothing to show" description={emptyMessage} />;
  return (
    <ol className="timeline-rail space-y-4 pl-8" aria-label="Shipping feed">
      {events.map((event) => {
        const meta = FEED_TYPE_META[event.type];
        const project = projects.get(event.projectId);
        return (
          <li key={event.id} className="relative">
            <span className={cn("absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface", meta.tone)} aria-hidden="true">
              <meta.Icon className="h-3.5 w-3.5" />
            </span>
            <article className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("stamp", meta.tone)}>{meta.label}</span>
                {event.verified ? <span className="stamp text-mint">Verified</span> : <span className="stamp text-amber">Unverified</span>}
                <time dateTime={event.occurredAt} className="font-mono text-xs text-slate" title={formatDateTime(event.occurredAt)}>
                  {formatRelative(event.occurredAt)}
                </time>
              </div>
              <h3 className="mt-2 font-medium text-ink">
                {event.milestoneId && project ? (
                  <Link href={`/projects/${project.slug}/milestones/${event.milestoneId}`} className="hover:text-primary">
                    {event.title}
                  </Link>
                ) : project ? (
                  <Link href={`/projects/${project.slug}`} className="hover:text-primary">
                    {event.title}
                  </Link>
                ) : (
                  event.title
                )}
              </h3>
              <p className="mt-1 text-sm text-slate">{event.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SourceChip url={event.sourceUrl} />
                {event.evidenceId ? (
                  <Link href={`/proof/${event.evidenceId}`} className="text-xs text-primary hover:underline">
                    Proof card
                  </Link>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

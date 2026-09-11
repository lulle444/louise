import { STATUS_LABELS } from "@/lib/domain/status";
import type { MilestoneStatusEvent } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { Pill } from "@/components/ui";

const ACTOR_TONE = { moderator: "mint", automated: "primary", community: "violet", project: "amber" } as const;
const ACTOR_LABEL = { moderator: "Moderator conclusion", automated: "Automated observation", community: "Community submission", project: "Project claim" } as const;

/** Semantic ordered list of status transitions; every entry names actor, reason, and prior/new state. */
export function StatusHistory({ events, compact = false }: { events: MilestoneStatusEvent[]; compact?: boolean }) {
  if (events.length === 0) return <p className="text-sm text-slate">No status events recorded.</p>;
  return (
    <ol className="timeline-rail space-y-4 pl-8" aria-label="Status history">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {event.priorStatus ? (
              <span className="text-xs text-slate">
                {STATUS_LABELS[event.priorStatus]} →
              </span>
            ) : (
              <span className="text-xs text-slate">Created →</span>
            )}
            <StatusBadge status={event.newStatus} />
            <Pill tone={ACTOR_TONE[event.actorKind]}>{ACTOR_LABEL[event.actorKind]}</Pill>
          </div>
          <p className={compact ? "mt-1 text-xs text-slate" : "mt-1 text-sm text-slate"}>{event.reason}</p>
          <p className="mt-1 font-mono text-[11px] text-slate-dim">
            {event.actorName} · {formatDateTime(event.createdAt)} · audit {event.auditId}
            {event.evidenceIds.length ? ` · ${event.evidenceIds.length} evidence ref${event.evidenceIds.length === 1 ? "" : "s"}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

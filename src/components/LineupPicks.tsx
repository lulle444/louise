import type { LineupPick, Narrative, PickRole } from "@/lib/types";
import { NarrativeIcon } from "./NarrativeIcon";

export const ROLE_META: Record<PickRole, { label: string; hint: string; color: string }> = {
  leader: { label: "Leader", hint: "Expected winner", color: "#22D3EE" },
  challenger: { label: "Challenger", hint: "Expected runner-up", color: "#8B5CF6" },
  wildcard: { label: "Wildcard", hint: "Underestimated mover", color: "#FBBF24" },
};

export function LineupPicks({
  picks,
  narrativeById,
  finishes,
  compact = false,
}: {
  picks: LineupPick[];
  narrativeById: Map<string, Narrative>;
  finishes?: Partial<Record<PickRole, { finish: number; hit: boolean; points: number }>>;
  compact?: boolean;
}) {
  const ordered = (["leader", "challenger", "wildcard"] as PickRole[]).map((role) => picks.find((p) => p.role === role)).filter(Boolean) as LineupPick[];
  return (
    <ul className={`grid gap-2 ${compact ? "grid-cols-3" : "sm:grid-cols-3"}`}>
      {ordered.map((p) => {
        const n = narrativeById.get(p.narrativeId);
        const meta = ROLE_META[p.role];
        const f = finishes?.[p.role];
        return (
          <li key={p.role} className="card-2 flex items-center gap-2 px-3 py-2" style={{ borderColor: `${meta.color}55` }}>
            {n ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md" style={{ background: `${n.accentColor}22`, color: n.accentColor }}>
                <NarrativeIcon name={n.icon} className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em]" style={{ color: meta.color }}>
                {meta.label}
              </p>
              <p className="truncate text-sm font-medium">{n?.name ?? "Unknown"}</p>
              {f ? (
                <p className="text-xs text-muted">
                  Finished #{f.finish} · {f.hit ? "hit" : "miss"} · {f.points.toFixed(0)} pts
                </p>
              ) : null}
            </div>
            <span className="mono text-sm font-semibold" aria-label={`${p.energy} Energy`}>
              {p.energy}
              <span className="text-[0.6rem] text-muted">E</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

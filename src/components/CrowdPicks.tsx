import { Lock, Users } from "lucide-react";
import type { CrowdPicks as CrowdPicksData, Narrative, PickRole } from "@/lib/types";
import { ROLE_META, LineupPicks } from "./LineupPicks";
import { NarrativeIcon } from "./NarrativeIcon";

export function CrowdPicks({
  crowd,
  narrativeById,
  hidden,
  reason,
}: {
  crowd: CrowdPicksData | null;
  narrativeById: Map<string, Narrative>;
  hidden: boolean;
  reason?: string;
}) {
  if (hidden || !crowd) {
    return (
      <div className="card relative overflow-hidden p-5" data-testid="crowd-hidden">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-2 py-6 text-center">
          <span className="rounded-full bg-surface-2 p-3 text-muted">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="font-semibold">Crowd Picks are hidden</p>
          <p className="max-w-sm text-sm text-muted">{reason ?? "Lock your own lineup first. The crowd is revealed the moment you commit, so nobody can copy the consensus."}</p>
        </div>
      </div>
    );
  }
  if (crowd.sampleSize === 0) {
    return (
      <div className="card p-5 text-sm text-muted" data-testid="crowd-revealed">
        No human lineups yet. Be the first to set the tone.
      </div>
    );
  }
  const name = (id: string) => narrativeById.get(id)?.name ?? "Unknown";
  return (
    <div className="card space-y-5 p-5" data-testid="crowd-revealed">
      <header className="flex items-center gap-2">
        <Users className="h-4 w-4 text-lime" aria-hidden="true" />
        <p className="font-semibold">Crowd Picks</p>
        <span className="ml-auto font-mono text-xs text-muted">{crowd.sampleSize} human lineups · AI excluded</span>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {(["leader", "challenger", "wildcard"] as PickRole[]).map((role) => (
          <div key={role} className="card-2 p-3">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em]" style={{ color: ROLE_META[role].color }}>
              Most common {ROLE_META[role].label}
            </p>
            <ol className="mt-2 space-y-1.5">
              {crowd.byRole[role].slice(0, 3).map((c) => {
                const n = narrativeById.get(c.narrativeId);
                return (
                  <li key={c.narrativeId} className="flex items-center gap-2 text-sm">
                    {n ? <NarrativeIcon name={n.icon} className="h-3.5 w-3.5" style={{ color: n.accentColor }} /> : null}
                    <span className="flex-1 truncate">{name(c.narrativeId)}</span>
                    <span className="mono text-xs text-muted">{Math.round(c.share * 100)}%</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <div>
        <p className="eyebrow mb-2">Energy-weighted conviction</p>
        <ul className="space-y-1">
          {crowd.conviction.slice(0, 5).map((c) => {
            const n = narrativeById.get(c.narrativeId);
            return (
              <li key={c.narrativeId} className="flex items-center gap-2 text-sm">
                <span className="w-32 truncate sm:w-44">{name(c.narrativeId)}</span>
                <span className="lane h-2 flex-1">
                  <span className="lane-fill block" style={{ width: `${Math.round(c.energyShare * 100)}%`, background: n?.accentColor ?? "#94A3B8" }} aria-hidden="true" />
                </span>
                <span className="mono w-10 text-right text-xs text-muted">{Math.round(c.energyShare * 100)}%</span>
              </li>
            );
          })}
        </ul>
      </div>

      {crowd.consensus ? (
        <div>
          <p className="eyebrow mb-2">Consensus lineup</p>
          <LineupPicks picks={crowd.consensus} narrativeById={narrativeById} compact />
        </div>
      ) : null}

      {crowd.disagreement ? (
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">Biggest disagreement:</span> {ROLE_META[crowd.disagreement.role].label} is split between{" "}
          <span className="text-ink">{name(crowd.disagreement.top.narrativeId)}</span> ({Math.round(crowd.disagreement.top.share * 100)}%) and{" "}
          <span className="text-ink">{name(crowd.disagreement.second.narrativeId)}</span> ({Math.round(crowd.disagreement.second.share * 100)}%).
        </p>
      ) : null}
    </div>
  );
}

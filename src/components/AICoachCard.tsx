import { Bot } from "lucide-react";
import type { AiProfile, Lineup, Narrative, RaceResult } from "@/lib/types";
import { LineupPicks } from "./LineupPicks";

export function AICoachCard({
  profile,
  lineup,
  result,
  narrativeById,
  locked,
}: {
  profile: AiProfile;
  lineup: Lineup | null;
  result?: RaceResult | null;
  narrativeById: Map<string, Narrative>;
  locked: boolean;
}) {
  return (
    <article className="card p-4" style={{ borderColor: `${profile.accentColor}44` }} data-testid={`ai-${profile.code.toLowerCase()}`}>
      <header className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${profile.accentColor}22`, color: profile.accentColor }}>
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold tracking-widest">{profile.name}</p>
          <p className="text-xs text-muted">{profile.tagline}</p>
        </div>
        {result ? (
          <span className="mono text-lg font-semibold" title="Race score">
            {result.raceScore.toFixed(0)}
          </span>
        ) : null}
      </header>
      <div className="mt-3">
        {lineup ? (
          <LineupPicks picks={lineup.picks} narrativeById={narrativeById} compact />
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted">
            {locked ? "No lineup for this Race." : "Locks at the deadline from the pre-lock snapshot. Lineups are never generated after the Race starts."}
          </p>
        )}
      </div>
      <p className="mt-3 text-[0.7rem] leading-relaxed text-dim">
        Rule-based ({profile.strategyVersion}). {profile.description}
      </p>
    </article>
  );
}

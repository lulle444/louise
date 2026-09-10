import Link from "next/link";
import { Bot, Users } from "lucide-react";

export function HumansVsAi({
  humans,
  ai,
}: {
  humans: { leadersCalled: number; races: number; wins: number; avg: number };
  ai: { leadersCalled: number; races: number; wins: number; avg: number };
}) {
  const total = Math.max(1, humans.avg + ai.avg);
  return (
    <div className="card overflow-hidden" data-testid="humans-vs-ai">
      <div className="grid grid-cols-[1fr_auto_1fr]">
        <div className="p-5">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Humans
          </p>
          <div className="lane mt-6 h-1.5">
            <span className="lane-fill bar-grow block bg-primary" style={{ width: `${Math.round((humans.avg / total) * 100)}%` }} aria-hidden="true" />
          </div>
          <p className="mono mt-4 text-sm text-muted">
            {humans.leadersCalled}/{humans.races} leaders · {humans.wins} Races won
          </p>
          <p className="mono text-xs text-dim">avg score {humans.avg.toFixed(1)}</p>
        </div>
        <div className="grid place-items-center border-x border-border px-4 font-mono text-xs tracking-[0.3em] text-muted">VS</div>
        <div className="p-5 text-right">
          <p className="flex items-center justify-end gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            AI coaches <Bot className="h-4 w-4 text-violet" aria-hidden="true" />
          </p>
          <div className="lane mt-6 h-1.5">
            <span className="lane-fill bar-grow ml-auto block bg-violet" style={{ width: `${Math.round((ai.avg / total) * 100)}%` }} aria-hidden="true" />
          </div>
          <p className="mono mt-4 text-sm text-muted">
            {ai.leadersCalled}/{ai.races} leaders · {ai.wins} Races won
          </p>
          <p className="mono text-xs text-dim">avg score {ai.avg.toFixed(1)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
        <span>Same Races, same rules, same clock. Human-average vs best-AI per Race.</span>
        <Link href="/methodology#ai" className="text-primary hover:underline">Methodology</Link>
      </div>
    </div>
  );
}

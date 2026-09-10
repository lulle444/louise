import Link from "next/link";
import { Bot, Users } from "lucide-react";
import type { HumansVsAiSummary } from "@/lib/services/stats";
import { formatAccuracy } from "@/lib/domain/format";

export function Scoreboard({ summary, compact = false }: { summary: HumansVsAiSummary; compact?: boolean }) {
  const h = summary.humanAccuracy;
  const a = summary.aiAccuracy;
  const lead = h.accuracy !== null && a.accuracy !== null ? (h.accuracy > a.accuracy ? "humans" : a.accuracy > h.accuracy ? "ai" : "tie") : "tie";
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <div className={`p-5 ${lead === "humans" ? "bg-cyan/5" : ""}`}>
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted"><Users className="size-3.5 text-cyan" aria-hidden /> Humans</p>
          <p className="num mt-2 text-4xl font-semibold text-cyan sm:text-5xl">{formatAccuracy(h.accuracy)}</p>
          <p className="num mt-1 text-xs text-muted">{h.correct}/{h.valid} correct · {summary.battleWins.humans} Rounds won</p>
        </div>
        <div className="grid place-items-center border-x border-border px-3 font-mono text-xs uppercase tracking-[0.2em] text-dim sm:px-5">vs</div>
        <div className={`p-5 text-right ${lead === "ai" ? "bg-violet/5" : ""}`}>
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">AI analysts <Bot className="size-3.5 text-violet" aria-hidden /></p>
          <p className="num mt-2 text-4xl font-semibold text-violet sm:text-5xl">{formatAccuracy(a.accuracy)}</p>
          <p className="num mt-1 text-xs text-muted">{a.correct}/{a.valid} correct · {summary.battleWins.ai} Rounds won</p>
        </div>
      </div>
      {!compact ? (
        <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
          {[
            { label: "Humans · 7d", v: summary.human7d, c: "text-cyan" },
            { label: "AI · 7d", v: summary.ai7d, c: "text-violet" },
            { label: "Humans · 30d", v: summary.human30d, c: "text-cyan" },
            { label: "AI · 30d", v: summary.ai30d, c: "text-violet" },
          ].map((x) => (
            <div key={x.label} className="bg-surface p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted">{x.label}</p>
              <p className={`num mt-1 text-lg font-semibold ${x.c}`}>{formatAccuracy(x.v.accuracy)} <span className="text-xs font-normal text-muted">({x.v.valid})</span></p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
        <span>Ties: {summary.battleWins.ties}. Same Rounds, same rules, same clock.</span>
        <Link href="/methodology" className="text-cyan hover:underline">Methodology</Link>
      </div>
    </div>
  );
}

import { EyeOff, Users } from "lucide-react";
import type { CrowdSignal as CrowdSignalData } from "@/lib/domain/crowd";
import type { Direction } from "@/lib/domain/types";
import { DIRECTION_META } from "@/components/ui/Pills";

const ORDER: Direction[] = ["bullish", "neutral", "bearish"];

export function CrowdSignal({ crowd, revealed, reason, viewerDirection, justRevealed = false, teaserTotal }: { crowd: CrowdSignalData | null; revealed: boolean; reason?: string; viewerDirection?: Direction | null; justRevealed?: boolean; teaserTotal?: number }) {
  return (
    <section className="card p-5" aria-labelledby="crowd-heading">
      <div className="flex items-center justify-between gap-2">
        <h3 id="crowd-heading" className="inline-flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-cyan" aria-hidden /> Crowd Signal</h3>
        <span className="num text-xs text-muted">{revealed && crowd ? `${crowd.total} locked` : teaserTotal !== undefined ? `${teaserTotal} locked` : ""}</span>
      </div>
      {!revealed || !crowd ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-2/40 p-4" role="status">
          <div className="space-y-2" aria-hidden>
            {ORDER.map((d) => (
              <div key={d} className="flex items-center gap-3">
                <span className={`w-16 font-mono text-[11px] uppercase tracking-wider ${DIRECTION_META[d].color}`}>{DIRECTION_META[d].label}</span>
                <span className="h-2 flex-1 rounded-full bg-border/60 blur-[2px]" />
                <span className="w-10 text-right font-mono text-xs text-muted blur-[3px]">??%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 inline-flex items-start gap-2 text-xs text-muted"><EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {reason ?? "Crowd percentages are hidden until you lock your own prediction, so the crowd never shapes your thesis."}</p>
        </div>
      ) : (
        <div className={`mt-4 space-y-3 ${justRevealed ? "rise" : ""}`}>
          {ORDER.map((d) => {
            const pct = crowd.percentages[d];
            const m = DIRECTION_META[d];
            const mine = viewerDirection === d;
            return (
              <div key={d}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider ${m.color}`}>
                    <m.Icon className="size-3.5" aria-hidden /> {m.label} {mine ? <span className="rounded bg-surface-3 px-1 py-0.5 text-[9px] text-text">you</span> : null}
                  </span>
                  <span className="num text-text">{pct}% <span className="text-muted">({crowd.counts[d]})</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-border/60" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.label} ${pct}%`}>
                  <div className={`fill-bar h-full rounded-full ${d === "bullish" ? "bg-bull" : d === "bearish" ? "bg-bear" : "bg-neutral"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {crowd.total === 0 ? <p className="text-xs text-muted">No human predictions locked yet.</p> : null}
          <p className="text-[11px] text-muted">Human predictions only. AI analyst positions are never counted in the Crowd Signal.</p>
        </div>
      )}
    </section>
  );
}

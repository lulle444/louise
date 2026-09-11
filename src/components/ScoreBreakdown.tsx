import Link from "next/link";
import { FORMULA_V1, SCORE_BAND_LABELS, getFormula, scoreBand } from "@/lib/domain/score";
import type { ScoreComponents, ShipScoreSnapshot } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ShipScoreGauge } from "./ShipScoreGauge";
import { cn } from "@/components/ui";

const COMPONENT_META: Record<keyof ScoreComponents, { label: string; description: string }> = {
  delivery: { label: "Milestone delivery", description: "Importance-weighted credit for approved milestones whose deadlines have passed." },
  development: { label: "Development continuity", description: "Release/tag cadence and weekly activity continuity from public repositories; not raw commit counts." },
  availability: { label: "Product availability", description: "Rolling success rate of timestamped checks against explicitly listed product endpoints." },
  transparency: { label: "Transparency", description: "Dated roadmap updates, published explanations, accessible documentation and change disclosure." },
  evidence: { label: "Evidence quality", description: "Hierarchy-weighted quality and completeness of accepted evidence." },
};

export function ScoreBreakdown({ snapshot, showExplanation = true, className }: { snapshot: ShipScoreSnapshot | null; showExplanation?: boolean; className?: string }) {
  if (!snapshot) {
    return (
      <div className={cn("card p-5", className)}>
        <p className="text-sm text-slate">No score snapshot has been calculated for this project yet.</p>
      </div>
    );
  }
  const formula = (() => {
    try {
      return getFormula(snapshot.formulaVersion);
    } catch {
      return FORMULA_V1;
    }
  })();
  const band = scoreBand(snapshot.total);
  return (
    <div className={cn("card p-5", className)}>
      <div className="flex flex-wrap items-start gap-5">
        <ShipScoreGauge total={snapshot.total} size={112} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Ship Score · formula {snapshot.formulaVersion}</p>
          <p className="mt-1 text-lg font-semibold text-ink">{SCORE_BAND_LABELS[band]}</p>
          <p className="mt-1 text-sm text-slate">This score measures documented delivery, not investment quality.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ConfidenceBadge confidence={snapshot.confidence} dataCompleteness={snapshot.dataCompleteness} />
            <span className="font-mono text-xs text-slate">Calculated {formatDateTime(snapshot.calculatedAt)}</span>
          </div>
        </div>
      </div>

      {snapshot.insufficientData ? (
        <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4 text-sm text-slate">
          <p className="font-medium text-ink">Insufficient data — no total is displayed.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {snapshot.insufficientReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="mt-5 space-y-3">
        {(Object.keys(COMPONENT_META) as (keyof ScoreComponents)[]).map((key) => {
          const value = snapshot.components[key];
          const weight = formula.weights[key];
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm font-medium text-ink">
                  {COMPONENT_META[key].label} <span className="font-mono text-xs text-slate">× {weight.toFixed(2)}</span>
                </dt>
                <dd className="font-mono text-sm tabular-nums text-ink">{value === null ? <span className="text-slate">no data</span> : value}</dd>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
                <div className={cn("h-full rounded-full", value === null ? "bg-slate-dim" : "bg-primary")} style={{ width: `${value ?? 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate">{COMPONENT_META[key].description}</p>
            </div>
          );
        })}
      </dl>

      {showExplanation ? (
        <details className="mt-5 rounded-lg border border-border bg-bg p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">Show exact calculation</summary>
          <ol className="mt-3 space-y-1 font-mono text-xs leading-relaxed text-slate">
            {snapshot.explanation.map((line, i) => (
              <li key={i} className={line.startsWith("•") ? "pl-4" : ""}>
                {line}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate">
            Read the full <Link href="/methodology" className="text-primary underline underline-offset-4">methodology</Link>. Snapshots are stored with raw component values and are never rewritten.
          </p>
        </details>
      ) : null}
    </div>
  );
}

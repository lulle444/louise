import type { Narrative } from "@/lib/types";
import { NarrativeIcon } from "./NarrativeIcon";
import { RankMove } from "./RankMove";

/** Top-three podium. Columns rise in order 3rd → 2nd → 1st (CSS keyframes). */
export function PodiumReveal({
  rows,
}: {
  rows: { narrative: Narrative; score: number; rank: number; startRank: number | null }[];
}) {
  const top = rows.filter((r) => r.rank <= 3).sort((a, b) => a.rank - b.rank);
  if (top.length < 3) return null;
  const order = [top[1], top[0], top[2]]; // 2nd, 1st, 3rd left→right
  const heights: Record<number, number> = { 1: 132, 2: 100, 3: 76 };
  const delays: Record<number, number> = { 3: 0, 2: 350, 1: 700 };
  return (
    <div className="podium" role="img" aria-label={`Podium: 1st ${top[0].narrative.name}, 2nd ${top[1].narrative.name}, 3rd ${top[2].narrative.name}`}>
      <div className="grid grid-cols-3 items-end gap-3">
        {order.map((r) => (
          <div key={r.narrative.id} className="flex flex-col items-center gap-2 text-center">
            <div className="podium-label" style={{ animationDelay: `${delays[r.rank] + 350}ms` }}>
              <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${r.narrative.accentColor}22`, color: r.narrative.accentColor }}>
                <NarrativeIcon name={r.narrative.icon} className="h-5 w-5" />
              </span>
              <p className="mt-1 text-sm font-semibold leading-tight">{r.narrative.name}</p>
              <p className="mono text-xs text-muted">
                {r.score.toFixed(1)} <RankMove from={r.startRank} to={r.rank} className="ml-1" />
              </p>
            </div>
            <div
              className="podium-col w-full rounded-t-lg"
              style={{
                height: heights[r.rank],
                background: `linear-gradient(180deg, ${r.narrative.accentColor}aa, ${r.narrative.accentColor}22)`,
                animationDelay: `${delays[r.rank]}ms`,
              }}
            >
              <span className="mono block pt-2 text-2xl font-bold text-bg/80">{r.rank}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

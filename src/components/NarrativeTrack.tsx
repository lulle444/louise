"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NarrativeIcon } from "./NarrativeIcon";
import { RankMove } from "./RankMove";
import { formatDateTime } from "@/lib/format";

export interface TrackRow {
  narrativeId: string;
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  accentColor: string;
  rank: number;
  previousRank: number | null;
  startRank: number | null;
  score: number;
  delta: number;
  quality: "ok" | "unavailable";
  highlight?: string | null; // e.g. "Leader"
}

/**
 * Ranked lanes with progress bars. Bars animate on mount (disabled by the
 * reduced-motion media query). Movement is shown with icons + numbers, not
 * color alone.
 */
export function NarrativeTrack({
  rows,
  takenAt,
  showStart = true,
  compact = false,
  title,
}: {
  rows: TrackRow[];
  takenAt: string | null;
  showStart?: boolean;
  compact?: boolean;
  title?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(1, ...rows.map((r) => r.score));

  return (
    <div className="space-y-2" data-testid="narrative-track">
      {title ? <p className="eyebrow">{title}</p> : null}
      <ol className="space-y-1.5" aria-label="Narrative standings">
        {rows.map((r) => (
          <li key={r.narrativeId} className="lane">
            <div
              className="lane-fill absolute inset-y-0 left-0 opacity-25"
              style={{
                width: ready ? `${(r.score / max) * 100}%` : "0%",
                background: `linear-gradient(90deg, ${r.accentColor}66, ${r.accentColor})`,
              }}
              aria-hidden="true"
            />
            <div className={`relative flex items-center gap-3 ${compact ? "px-3 py-1.5" : "px-3 py-2.5 sm:px-4"}`}>
              <span className="mono w-6 text-right text-sm font-semibold text-muted">{r.rank}</span>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md" style={{ background: `${r.accentColor}22`, color: r.accentColor }}>
                <NarrativeIcon name={r.icon} className="h-4 w-4" />
              </span>
              <Link href={`/narratives/${r.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                <span className="sm:hidden">{r.shortName}</span>
                <span className="hidden sm:inline">{r.name}</span>
                {r.highlight ? (
                  <span className="ml-2 rounded bg-lime/15 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-lime">{r.highlight}</span>
                ) : null}
              </Link>
              {showStart && r.startRank !== null && !compact ? (
                <span className="hidden font-mono text-xs text-dim sm:inline" title="Starting rank at lock">
                  start {r.startRank}
                </span>
              ) : null}
              <RankMove from={r.previousRank} to={r.rank} />
              {r.quality === "unavailable" ? (
                <span className="font-mono text-xs text-coral">n/a</span>
              ) : (
                <span className="mono w-14 text-right text-sm font-semibold">
                  {r.score.toFixed(1)}
                  {r.delta !== 0 && !compact ? (
                    <span className={`ml-1 text-[0.65rem] ${r.delta > 0 ? "text-lime" : "text-coral"}`}>
                      {r.delta > 0 ? "+" : ""}
                      {r.delta.toFixed(1)}
                    </span>
                  ) : null}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
      {takenAt ? <p className="text-xs text-dim">Snapshot taken {formatDateTime(takenAt)}</p> : null}
    </div>
  );
}

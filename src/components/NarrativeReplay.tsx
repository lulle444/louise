"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { formatDateTime } from "@/lib/format";
import { NarrativeIcon } from "./NarrativeIcon";
import { RankMove } from "./RankMove";
import { RelativeTime } from "./RelativeTime";

export interface ReplayNarrative {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  accentColor: string;
  highlight?: string | null;
}

export interface ReplayFrame {
  takenAt: string;
  scores: Record<string, number>;
}

interface RankedRow {
  id: string;
  score: number;
  rank: number;
}

function rankFrame(frame: ReplayFrame, ids: string[]): RankedRow[] {
  return ids
    .map((id) => ({ id, score: frame.scores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Animated standings: plays the Race's snapshot history frame by frame.
 * Lanes slide to their new rank (transform transition), bars stretch with the
 * score, and movement arrows compare with the starting rank. Under reduced
 * motion the final frame is shown without playback.
 */
export function NarrativeReplay({
  narratives,
  frames,
  compact = false,
  autoplay = true,
  title,
  storageKey,
}: {
  narratives: ReplayNarrative[];
  frames: ReplayFrame[];
  compact?: boolean;
  autoplay?: boolean;
  title?: string;
  /** When set, lanes whose score changed since the viewer last saw this key are flagged. */
  storageKey?: string;
}) {
  const reduced = useReducedMotion();
  const ids = useMemo(() => narratives.map((n) => n.id), [narratives]);
  const byId = useMemo(() => new Map(narratives.map((n) => [n.id, n])), [narratives]);
  const ranked = useMemo(() => frames.map((f) => rankFrame(f, ids)), [frames, ids]);
  const last = Math.max(0, frames.length - 1);
  const [index, setIndex] = useState(last);
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [changed, setChanged] = useState<Set<string>>(() => new Set());

  const stepMs = Math.max(140, Math.min(420, 6000 / Math.max(1, frames.length)));
  const rowH = compact ? 40 : 52;

  const play = useCallback(() => {
    if (frames.length < 2) return;
    setIndex(0);
    setPlaying(true);
  }, [frames.length]);

  // Compare the latest scores with what this browser saw last time.
  useEffect(() => {
    if (!storageKey || !frames.length) return;
    const key = `mr:seen:${storageKey}`;
    const latest = frames[frames.length - 1].scores;
    const raf = requestAnimationFrame(() => {
      try {
        const prev = JSON.parse(localStorage.getItem(key) ?? "null") as Record<string, number> | null;
        if (prev) {
          const diff = new Set(Object.keys(latest).filter((id) => Math.abs((prev[id] ?? latest[id]) - latest[id]) >= 0.5));
          if (diff.size) setChanged(diff);
        }
        localStorage.setItem(key, JSON.stringify(latest));
      } catch {
        // storage unavailable — skip the flash
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [storageKey, frames]);

  // Autoplay once the track scrolls into view.
  useEffect(() => {
    if (!autoplay || reduced || frames.length < 2 || started.current) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      started.current = true;
      const t = setTimeout(play, 300);
      return () => clearTimeout(t);
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !started.current) {
        started.current = true;
        setTimeout(play, 250);
        obs.disconnect();
      }
    }, { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoplay, reduced, frames.length, play]);

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      const t = setTimeout(() => setPlaying(false), stepMs);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndex((i) => Math.min(last, i + 1)), stepMs);
    return () => clearTimeout(t);
  }, [playing, index, last, stepMs]);

  const frameIdx = reduced ? last : index;
  const rows = ranked[frameIdx] ?? [];
  const start = ranked[0] ?? [];
  const startRank = new Map(start.map((r) => [r.id, r.rank]));
  const max = Math.max(1, ...rows.map((r) => r.score));
  const takenAt = frames[frameIdx]?.takenAt ?? null;

  if (!frames.length) return <p className="text-sm text-muted">No snapshots yet.</p>;

  return (
    <div ref={containerRef} className="space-y-2" data-testid="narrative-track">
      {(title || frames.length > 1) && (
        <div className="flex items-center gap-2">
          {title ? <p className="eyebrow flex-1">{title}</p> : <span className="flex-1" />}
          {frames.length > 1 && !reduced ? (
            <div className="flex items-center gap-1">
              <span className="lane relative h-1.5 w-20 overflow-hidden" aria-hidden="true">
                <span className="lane-fill absolute inset-y-0 left-0 bg-cyan" style={{ width: `${(frameIdx / last) * 100}%`, transitionDuration: `${stepMs}ms`, transitionTimingFunction: "linear" }} />
              </span>
              <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => (playing ? setPlaying(false) : index >= last ? play() : setPlaying(true))} aria-label={playing ? "Pause replay" : index >= last ? "Replay race" : "Play replay"}>
                {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : index >= last ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            </div>
          ) : null}
        </div>
      )}
      <ol className="relative" style={{ height: rows.length * rowH }} aria-label="Narrative standings" aria-live="off">
        {ids.map((id) => {
          const row = rows.find((r) => r.id === id);
          const n = byId.get(id);
          if (!row || !n) return null;
          return (
            <li
              key={id}
              className={`lane replay-row ${changed.has(id) && frameIdx === last ? "lane-flash" : ""}`}
              style={{ height: rowH - 6, transform: `translateY(${(row.rank - 1) * rowH}px)` }}
            >
              <div
                className="lane-fill absolute inset-y-0 left-0 opacity-25"
                style={{ width: `${(row.score / max) * 100}%`, background: `linear-gradient(90deg, ${n.accentColor}66, ${n.accentColor})`, transitionDuration: `${Math.max(300, stepMs)}ms` }}
                aria-hidden="true"
              />
              <div className={`relative flex h-full items-center gap-3 ${compact ? "px-3" : "px-3 sm:px-4"}`}>
                <span className="mono w-6 text-right text-sm font-semibold text-muted">{row.rank}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md" style={{ background: `${n.accentColor}22`, color: n.accentColor }}>
                  <NarrativeIcon name={n.icon} className="h-4 w-4" />
                </span>
                <Link href={`/narratives/${n.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  <span className="sm:hidden">{n.shortName}</span>
                  <span className="hidden sm:inline">{n.name}</span>
                  {n.highlight ? <span className="ml-2 rounded bg-lime/15 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-lime">{n.highlight}</span> : null}
                </Link>
                {changed.has(id) && frameIdx === last ? <span className="changed-dot" title="Changed since your last visit" aria-label="Changed since your last visit" /> : null}
                <RankMove from={startRank.get(id) ?? null} to={row.rank} />
                <span className="mono w-12 text-right text-sm font-semibold">{row.score.toFixed(1)}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {takenAt ? (
        <p className="text-xs text-dim">
          {frameIdx === last ? (
            <>
              Latest snapshot <RelativeTime iso={takenAt} fallback={formatDateTime(takenAt)} /> · {formatDateTime(takenAt)}
            </>
          ) : (
            <>Replaying · {formatDateTime(takenAt)}</>
          )}{" "}
          · movement vs starting rank{changed.size && frameIdx === last ? ` · ${changed.size} changed since your last visit` : ""}
        </p>
      ) : null}
    </div>
  );
}

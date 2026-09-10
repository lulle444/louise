"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}
const getNow = () => Math.floor(Date.now() / 30_000) * 30_000;
const getServerNow = () => 0;

export function relativeLabel(fromMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - fromMs);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

/** "3 min ago" label that re-renders every 30 seconds. Falls back to the absolute time during SSR. */
export function RelativeTime({ iso, fallback }: { iso: string; fallback: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const label = now === 0 ? fallback : relativeLabel(Date.parse(iso), now);
  return (
    <time dateTime={iso} title={fallback}>
      {label}
    </time>
  );
}

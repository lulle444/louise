"use client";

import { useSyncExternalStore } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000;
const getServerNow = () => 0;

/** Live countdown. Renders a static value on the server and ticks on the client. */
export function RaceCountdown({ target, label, compact = false }: { target: string; label: string; compact?: boolean }) {
  const targetMs = Date.parse(target);
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const hydrated = now !== 0;
  const p = parts(hydrated ? targetMs - now : 0);
  const fmt = (v: number) => (hydrated ? String(v).padStart(2, "0") : "--");
  const cells: [string, number][] = [
    ["days", p.d],
    ["hrs", p.h],
    ["min", p.m],
    ["sec", p.s],
  ];
  if (compact) {
    return (
      <span className="mono text-sm" aria-live="off">
        {hydrated ? `${p.d}d ${p.h}h ${p.m}m` : "—"}
      </span>
    );
  }
  return (
    <div role="timer" aria-label={label}>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex gap-2">
        {cells.map(([unit, value]) => (
          <div key={unit} className="card-2 min-w-[3.6rem] px-2 py-2 text-center">
            <div className="mono text-2xl font-semibold leading-none">{fmt(value)}</div>
            <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

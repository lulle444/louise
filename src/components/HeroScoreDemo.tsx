"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Code2, FileText, Package } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { cn } from "@/components/ui";

const TARGET = 86;
const STEPS = [
  { label: "Commitment", detail: "Roadmap, dated", Icon: FileText, at: 0.12 },
  { label: "Code", detail: "Release tag v2.1", Icon: Code2, at: 0.4 },
  { label: "Product", detail: "Live, checked", Icon: Package, at: 0.68 },
  { label: "Verified", detail: "Moderator reviewed", Icon: BadgeCheck, at: 0.95 },
];
const COMPONENTS = [
  { label: "Delivery", value: 82 },
  { label: "Development", value: 88 },
  { label: "Availability", value: 98 },
  { label: "Transparency", value: 90 },
  { label: "Evidence", value: 78 },
];

const RISE_MS = 2600;
const HOLD_MS = 3200;
const RESET_MS = 600;
const CYCLE = RISE_MS + HOLD_MS + RESET_MS;

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Illustrative Ship Score card: the ring fills as the evidence trail lights up.
 * Pure UI demonstration; values are an example, not a real project.
 */
export function HeroScoreDemo() {
  const [progress, setProgress] = useState(1);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - start < 32) setAnimate(true);
      const t = (now - start) % CYCLE;
      let p: number;
      if (t < RISE_MS) p = easeOut(t / RISE_MS);
      else if (t < RISE_MS + HOLD_MS) p = 1;
      else p = 1 - (t - RISE_MS - HOLD_MS) / RESET_MS;
      setProgress(p);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const score = Math.round(TARGET * progress);
  const size = 168;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="mx-auto w-full max-w-md" aria-label="Illustration of a Ship Score being verified from evidence" role="img">
      <div className={cn("relative", animate && "hero-float")}>
      <div className="card relative overflow-hidden p-6 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.92)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={28} className="rounded-md" />
            <span className="eyebrow">Ship Score</span>
          </div>
          <span className="stamp text-slate">formula v1.0.0</span>
        </div>

        <div className="mt-5 flex items-center gap-5">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
              <defs>
                <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#26c6f5" />
                  <stop offset="1" stopColor="#1f8bf0" />
                </linearGradient>
              </defs>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e3ecf6" strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#hero-ring)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-extrabold tabular-nums leading-none text-ink">{score}</span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate">/ 100</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{progress >= 0.98 ? "Consistent documented delivery" : "Verifying evidence…"}</p>
            <p className="mt-1 text-xs text-slate">Measures documented delivery, not investment quality.</p>
            <ul className="mt-3 space-y-1.5">
              {COMPONENTS.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-[11px] text-slate">
                  <span className="w-20 shrink-0">{c.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${c.value * progress}%` }} />
                  </span>
                  <span className="w-6 text-right font-mono text-ink">{Math.round(c.value * progress)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ol className="relative mt-6 grid grid-cols-4 gap-2" aria-hidden="true">
          <span className="absolute left-[12%] right-[12%] top-[18px] h-0.5 bg-border" />
          <span className="absolute left-[12%] top-[18px] h-0.5 bg-primary transition-none" style={{ width: `${Math.max(0, Math.min(1, (progress - 0.1) / 0.85)) * 76}%` }} />
          {STEPS.map((s) => {
            const lit = progress >= s.at;
            return (
              <li key={s.label} className="relative flex flex-col items-center text-center">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 bg-surface transition-colors duration-300", lit ? "border-primary text-primary" : "border-border text-slate-dim")}>
                  <s.Icon className="h-4 w-4" />
                </span>
                <span className={cn("mt-2 text-[11px] font-semibold", lit ? "text-ink" : "text-slate-dim")}>{s.label}</span>
                <span className="text-[10px] text-slate">{s.detail}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={cn("absolute -top-4 left-6 hidden rounded-lg border border-mint/40 bg-white px-3 py-1.5 text-xs font-medium text-mint shadow-md sm:block", animate && "hero-float-slow")} style={{ animationDelay: "-2s" }}>
        <span className="inline-flex items-center gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified from public evidence
        </span>
      </div>
      <div className={cn("absolute -bottom-3 right-6 hidden rounded-lg border border-border bg-white px-3 py-1.5 font-mono text-[11px] text-slate shadow-md sm:block", animate && "hero-float-slow")} style={{ animationDelay: "-4s" }}>
        Shipped 3 days before deadline
      </div>
      </div>
      <p className="mt-6 text-center text-[11px] text-slate-dim">Illustrative example. Real scores are calculated from stored evidence and published per project.</p>
    </div>
  );
}

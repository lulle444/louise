"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle animated background: a handful of slow-drifting price traces and
 * soft pulses on Callscore palette. Purely decorative (aria-hidden).
 * - Renders a single static frame when the user prefers reduced motion.
 * - Pauses while the tab is hidden.
 */
export function SignalField({ className = "", opacity = 1 }: { className?: string; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = ["#0E8F7E", "#0F1A2B", "#0E8F7E", "#5B6B7F"];
    const traces = Array.from({ length: 3 }, (_, i) => ({
      color: colors[i % colors.length],
      seed: Math.random() * 1000,
      speed: 0.12 + Math.random() * 0.1,
      amp: 0.08 + Math.random() * 0.1,
      base: 0.3 + (i / 5) * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));
    const pulses = Array.from({ length: 6 }, () => ({ x: Math.random(), y: Math.random(), t: Math.random() * 6, life: 5 + Math.random() * 4 }));

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const noise = (x: number, seed: number) => Math.sin(x * 1.7 + seed) * 0.5 + Math.sin(x * 0.53 + seed * 1.3) * 0.3 + Math.sin(x * 3.1 + seed * 0.7) * 0.2;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const tr of traces) {
        ctx.beginPath();
        const steps = 90;
        for (let s = 0; s <= steps; s++) {
          const px = (s / steps) * width;
          const x = s / steps;
          const y = height * (tr.base + noise(x * 6 + time * tr.speed, tr.seed) * tr.amp + Math.sin(time * 0.2 + tr.phase) * 0.02);
          if (s === 0) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, `${tr.color}00`);
        grad.addColorStop(0.35, `${tr.color}66`);
        grad.addColorStop(0.7, `${tr.color}55`);
        grad.addColorStop(1, `${tr.color}00`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
      for (const p of pulses) {
        const k = (p.t % p.life) / p.life;
        const r = 2 + k * 26;
        const a = (1 - k) * 0.35;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(14, 143, 126, ${a.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(14, 143, 126, ${(0.5 * (1 - k)).toFixed(3)})`;
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      for (const p of pulses) {
        p.t += dt;
        if (p.t % p.life < dt) {
          p.x = Math.random();
          p.y = Math.random();
        }
      }
      draw();
      raf = window.requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        last = performance.now();
        raf = window.requestAnimationFrame(frame);
      }
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    if (reduced) {
      time = 3;
      draw();
    } else {
      raf = window.requestAnimationFrame(frame);
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} style={{ opacity }} />;
}

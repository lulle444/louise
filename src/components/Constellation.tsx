"use client";

import { useEffect, useRef } from "react";

/**
 * Hero backdrop: faint grid, slow orbital rings, glowing nodes and three
 * drifting signal waves. The whole layer scrolls slightly slower than the
 * content (parallax). CSS-only motion; disabled under reduced motion.
 */
export function Constellation() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(0, ${Math.min(window.scrollY, 900) * 0.18}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const dots = [
    { l: "6%", t: "18%", d: "0s" },
    { l: "38%", t: "62%", d: "0.8s" },
    { l: "52%", t: "24%", d: "1.6s" },
    { l: "71%", t: "80%", d: "2.4s" },
    { l: "88%", t: "34%", d: "1.1s" },
    { l: "24%", t: "86%", d: "2s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div ref={ref} className="hero-parallax absolute inset-[-10%]">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <svg className="signal-waves" viewBox="0 0 1440 700" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-cyan" x1="0" x2="1">
              <stop offset="0" stopColor="#22D3EE" stopOpacity="0" />
              <stop offset="0.5" stopColor="#22D3EE" stopOpacity="0.55" />
              <stop offset="1" stopColor="#22D3EE" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave-violet" x1="0" x2="1">
              <stop offset="0" stopColor="#8B5CF6" stopOpacity="0" />
              <stop offset="0.5" stopColor="#8B5CF6" stopOpacity="0.5" />
              <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave-lime" x1="0" x2="1">
              <stop offset="0" stopColor="#B4F464" stopOpacity="0" />
              <stop offset="0.5" stopColor="#B4F464" stopOpacity="0.35" />
              <stop offset="1" stopColor="#B4F464" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="signal-wave" pathLength={1} stroke="url(#wave-cyan)" d="M-40 420 C 200 300, 380 520, 620 400 S 1000 250, 1240 380 S 1400 460, 1500 420" />
          <path className="signal-wave signal-wave-2" pathLength={1} stroke="url(#wave-violet)" d="M-40 300 C 260 180, 420 380, 700 280 S 1050 140, 1260 260 S 1420 340, 1500 300" />
          <path className="signal-wave signal-wave-3" pathLength={1} stroke="url(#wave-lime)" d="M-40 540 C 240 460, 480 620, 760 520 S 1080 420, 1300 500 S 1440 560, 1500 540" />
        </svg>
        <div className="orbit" style={{ width: "58vw", height: "58vw", maxWidth: 900, maxHeight: 900, left: "-6%", top: "-30%" }} />
        <div className="orbit orbit-2" style={{ width: "44vw", height: "44vw", maxWidth: 700, maxHeight: 700, right: "-8%", top: "-10%" }} />
        <div className="orbit orbit-3" style={{ width: "80vw", height: "80vw", maxWidth: 1300, maxHeight: 1300, left: "10%", top: "-60%" }} />
        {dots.map((d, i) => (
          <span key={i} className="node-dot" style={{ left: d.l, top: d.t, animationDelay: d.d, opacity: 0.75 }} />
        ))}
        <div className="aurora aurora-a" style={{ opacity: 0.24 }} />
        <div className="aurora aurora-b" style={{ opacity: 0.2 }} />
      </div>
    </div>
  );
}

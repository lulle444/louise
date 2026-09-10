"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/**
 * Counts up to `value` on mount. Renders the final value on the server so
 * there is no hydration mismatch; the tween starts from zero on the client.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const from = previous.current ?? 0;
    previous.current = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  const display = reduced ? value : shown;
  return (
    <span className={`mono ${className}`} aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

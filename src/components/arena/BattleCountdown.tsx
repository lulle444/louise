"use client";

import { formatDuration } from "@/lib/domain/format";
import { useNow } from "@/components/ui/useNow";

/** Live countdown to a timestamp. Deadlines are enforced server-side; this is display only. */
export function BattleCountdown({ target, label, className = "" }: { target: string; label?: string; className?: string }) {
  const now = useNow();
  const ms = now === null ? null : Math.max(0, Date.parse(target) - now);
  const text = ms === null ? "—" : ms === 0 ? "Closed" : ms < 3_600_000 ? `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s` : formatDuration(ms);
  return (
    <span className={`num ${className}`} role="timer" aria-live="off" aria-label={label ? `${label}: ${text}` : text} suppressHydrationWarning>
      {text}
    </span>
  );
}

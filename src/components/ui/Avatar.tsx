import { initials } from "@/lib/domain/format";
import { hashString } from "@/lib/domain/random";

const PALETTE = ["#0E8F7E", "#0F1A2B", "#0B6F62", "#334155", "#1E5F56", "#475569"];

export function Avatar({ name, size = "md", color, className = "" }: { name: string; size?: "sm" | "md" | "lg" | "xl"; color?: string; className?: string }) {
  const accent = color ?? PALETTE[hashString(name) % PALETTE.length];
  const dims = size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-14 text-lg" : size === "xl" ? "size-20 text-2xl" : "size-9 text-xs";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-mono font-semibold uppercase ${dims} ${className}`}
      style={{ background: `${accent}22`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}55` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

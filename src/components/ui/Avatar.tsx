import { initials } from "@/lib/domain/format";
import { hashString } from "@/lib/domain/random";

const PALETTE = ["#21D4FD", "#8B5CF6", "#34D399", "#FBBF24", "#EC4899", "#60A5FA", "#F97316"];

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

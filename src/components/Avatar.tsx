import { hashString } from "@/lib/prng";

const HUES = [92, 188, 262, 348, 38, 200, 150];

export function Avatar({ seed, name, size = 36, className = "" }: { seed: string; name: string; size?: number; className?: string }) {
  const h = hashString(seed);
  const hue = HUES[h % HUES.length];
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 70% 22%), hsl(${(hue + 40) % 360} 70% 32%))`,
        color: `hsl(${hue} 90% 85%)`,
        border: `1px solid hsl(${hue} 60% 40% / 0.6)`,
        fontSize: size * 0.34,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

const META: Record<string, { color: string; glyph: string }> = {
  BTC: { color: "#D97706", glyph: "₿" },
  ETH: { color: "#4F46E5", glyph: "Ξ" },
  SOL: { color: "#0E8F7E", glyph: "◎" },
};

export function AssetMark({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" | "lg" }) {
  const m = META[symbol] ?? { color: "#94A3B8", glyph: symbol.charAt(0) };
  const dims = size === "sm" ? "size-7 text-xs" : size === "lg" ? "size-12 text-xl" : "size-9 text-base";
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg font-semibold ${dims}`} style={{ background: `${m.color}1f`, color: m.color, boxShadow: `inset 0 0 0 1px ${m.color}55` }} aria-hidden>
      {m.glyph}
    </span>
  );
}

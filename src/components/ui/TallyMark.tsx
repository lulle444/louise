/** Callscore brand mark: four tally strokes crossed by a fifth — "keeping score". */
export function TallyMark({ size = 32, className = "", tone = "solid" }: { size?: number; className?: string; tone?: "solid" | "outline" }) {
  const solid = tone === "solid";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={solid ? "#0E8F7E" : "none"} stroke={solid ? "none" : "currentColor"} strokeWidth={solid ? 0 : 3} />
      <g stroke={solid ? "#FFFFFF" : "currentColor"} strokeWidth="5" strokeLinecap="round">
        <line x1="19" y1="20" x2="19" y2="44" />
        <line x1="28" y1="20" x2="28" y2="44" />
        <line x1="37" y1="20" x2="37" y2="44" />
        <line x1="46" y1="20" x2="46" y2="44" />
        <line x1="12" y1="46" x2="53" y2="18" stroke={solid ? "#FDE68A" : "currentColor"} strokeWidth="5.5" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-sans text-[17px] font-extrabold tracking-tight text-text ${className}`}>call<span className="text-cyan">score</span></span>;
}

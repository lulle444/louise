/** Alphr brand mark: a rising chevron over a baseline — "the call, graded". */
export function TallyMark({ size = 32, className = "", tone = "solid" }: { size?: number; className?: string; tone?: "solid" | "outline" }) {
  const solid = tone === "solid";
  const fg = solid ? "#FFFFFF" : "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={solid ? "#4F46E5" : "none"} stroke={solid ? "none" : "currentColor"} strokeWidth={solid ? 0 : 3} />
      <path d="M14 42 L32 18 L50 42" fill="none" stroke={fg} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="50" x2="48" y2="50" stroke={solid ? "#FDE68A" : "currentColor"} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-sans text-[18px] font-extrabold tracking-tight text-text ${className}`}>alph<span className="text-cyan">r</span></span>;
}

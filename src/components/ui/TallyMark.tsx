/** Alphr brand mark: rising zigzag stroke with a dot, on an indigo gradient tile. */
export function TallyMark({ size = 32, className = "", tone = "solid" }: { size?: number; className?: string; tone?: "solid" | "outline" }) {
  const solid = tone === "solid";
  const fg = solid ? "#FFFFFF" : "currentColor";
  const id = `alphr-g-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B1FE3" />
          <stop offset="0.55" stopColor="#4433FF" />
          <stop offset="1" stopColor="#6A3BEA" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={solid ? `url(#${id})` : "none"} stroke={solid ? "none" : "currentColor"} strokeWidth={solid ? 0 : 3} />
      <path d="M15 46 L29 22 L41 40 L46 33" fill="none" stroke={fg} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="24" r="4.5" fill={fg} />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-sans text-[18px] font-extrabold tracking-tight text-text ${className}`}>alph<span className="text-cyan">r</span></span>;
}

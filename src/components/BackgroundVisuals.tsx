/**
 * Ambient background: drifting brand-coloured glows, faint "trace" lines with
 * pulses travelling along them, and small verification nodes. Pure CSS/SVG,
 * no JavaScript, pointer-events disabled, and fully static when the visitor
 * prefers reduced motion.
 */
const TRACES = [
  "M -50 180 C 200 180, 260 90, 520 90 S 900 260, 1180 260 S 1500 120, 1700 120",
  "M -50 620 C 260 620, 300 480, 620 480 S 980 700, 1260 700 S 1520 560, 1700 560",
  "M -50 900 C 180 900, 340 800, 640 800 S 1000 940, 1300 940 S 1560 860, 1700 860",
];

const NODES: { x: number; y: number; delay: number; check?: boolean }[] = [
  { x: 520, y: 90, delay: 0, check: true },
  { x: 1180, y: 260, delay: 1.6 },
  { x: 620, y: 480, delay: 0.8 },
  { x: 1260, y: 700, delay: 2.4, check: true },
  { x: 640, y: 800, delay: 1.2 },
  { x: 1300, y: 940, delay: 3.1, check: true },
];

export function BackgroundVisuals() {
  return (
    <div className="bg-visuals" aria-hidden="true">
      <div className="bg-visuals__glow bg-visuals__glow--a" />
      <div className="bg-visuals__glow bg-visuals__glow--b" />
      <div className="bg-visuals__glow bg-visuals__glow--c" />
      <svg className="bg-visuals__traces" viewBox="0 0 1650 1100" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="bgv-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1f8bf0" stopOpacity="0" />
            <stop offset="0.5" stopColor="#1f8bf0" stopOpacity="0.5" />
            <stop offset="1" stopColor="#26c6f5" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="bgv-pulse">
            <stop offset="0" stopColor="#26c6f5" stopOpacity="0.9" />
            <stop offset="1" stopColor="#26c6f5" stopOpacity="0" />
          </radialGradient>
        </defs>
        {TRACES.map((d, i) => (
          <path key={i} d={d} className="bgv-trace" style={{ animationDelay: `${i * -4}s` }} />
        ))}
        {TRACES.map((d, i) => (
          <circle key={`pulse-${i}`} r="7" fill="url(#bgv-pulse)" className="bgv-pulse" style={{ offsetPath: `path("${d}")`, animationDelay: `${i * -6}s`, animationDuration: `${18 + i * 4}s` }} />
        ))}
        {NODES.map((n, i) => (
          <g key={i} className="bgv-node" style={{ animationDelay: `${n.delay}s` }} transform={`translate(${n.x} ${n.y})`}>
            <circle r="14" className="bgv-node__halo" />
            <circle r="5" className="bgv-node__core" />
            {n.check ? <path d="M -4 0.5 L -1 3.5 L 4.5 -3" className="bgv-node__check" /> : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

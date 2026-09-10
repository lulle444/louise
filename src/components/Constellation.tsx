/** Signal-Arena-style hero backdrop: faint grid, slow orbital rings, glowing nodes. */
export function Constellation() {
  const dots = [
    { l: "6%", t: "18%", d: "0s" },
    { l: "38%", t: "62%", d: "0.8s" },
    { l: "52%", t: "24%", d: "1.6s" },
    { l: "71%", t: "80%", d: "2.4s" },
    { l: "88%", t: "34%", d: "1.1s" },
    { l: "24%", t: "86%", d: "2s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 grid-lines opacity-60" />
      <div className="orbit" style={{ width: "58vw", height: "58vw", maxWidth: 900, maxHeight: 900, left: "-6%", top: "-30%" }} />
      <div className="orbit orbit-2" style={{ width: "44vw", height: "44vw", maxWidth: 700, maxHeight: 700, right: "-8%", top: "-10%" }} />
      <div className="orbit orbit-3" style={{ width: "80vw", height: "80vw", maxWidth: 1300, maxHeight: 1300, left: "10%", top: "-60%" }} />
      {dots.map((d, i) => (
        <span key={i} className="node-dot" style={{ left: d.l, top: d.t, animationDelay: d.d, opacity: 0.7 }} />
      ))}
      <div className="aurora aurora-a" style={{ opacity: 0.22 }} />
      <div className="aurora aurora-b" style={{ opacity: 0.18 }} />
    </div>
  );
}

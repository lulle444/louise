/** Slow drifting glow blobs + grid. Pure CSS; disabled under reduced motion. */
export function AuroraBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 grid-lines opacity-70" />
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <div className="aurora aurora-c" />
      <div className="scanline" />
    </div>
  );
}

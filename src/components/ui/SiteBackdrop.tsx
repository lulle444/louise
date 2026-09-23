import { SignalField } from "@/components/ui/SignalField";

/**
 * Site-wide dynamic background. Sits in a fixed layer behind every page:
 * three slow-drifting colour fields (indigo, amber, green), wavy contour lines and
 * the animated SignalField price traces. Purely decorative and inert to
 * pointer events; all motion is disabled by the global reduced-motion rule.
 */
export function SiteBackdrop() {
  return (
    <div className="backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="backdrop-blob backdrop-blob-a" />
      <div className="backdrop-blob backdrop-blob-b" />
      <div className="backdrop-blob backdrop-blob-c" />
      <div className="backdrop-waves absolute inset-0" />
      <SignalField opacity={0.32} />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}

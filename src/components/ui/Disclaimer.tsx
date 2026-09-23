import { DISCLAIMER } from "@/lib/config";

export function Disclaimer({ compact = false, tone = "muted" }: { compact?: boolean; tone?: "muted" | "inherit" }) {
  return (
    <p className={`${tone === "muted" ? "text-muted" : ""} ${compact ? "text-xs" : "text-sm"}`} role="note">
      {DISCLAIMER}
    </p>
  );
}

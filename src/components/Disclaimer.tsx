import { DISCLAIMER } from "@/lib/config";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`text-muted ${compact ? "text-xs" : "text-sm"} leading-relaxed`} role="note">
      {DISCLAIMER}
    </p>
  );
}

import { Gauge } from "lucide-react";
import { confidenceLabel } from "@/lib/domain/score";
import { cn } from "@/components/ui";

export function ConfidenceBadge({ confidence, dataCompleteness, className }: { confidence: number; dataCompleteness: number; className?: string }) {
  const label = confidenceLabel(confidence);
  const tone = label === "High" ? "text-mint border-mint/40" : label === "Medium" ? "text-amber border-amber/40" : "text-coral border-coral/40";
  return (
    <span
      className={cn("stamp", tone, className)}
      title={`Confidence ${Math.round(confidence * 100)}% · data completeness ${Math.round(dataCompleteness * 100)}% of formula weight available`}
    >
      <Gauge className="h-3 w-3" aria-hidden="true" />
      Confidence {label} · data {Math.round(dataCompleteness * 100)}%
    </span>
  );
}

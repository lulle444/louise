import { SITE } from "@/lib/config";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate ${className}`}>
      <span className="font-semibold text-slate">Disclaimer.</span> {SITE.disclaimer}
    </p>
  );
}

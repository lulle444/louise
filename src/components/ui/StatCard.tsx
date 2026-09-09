import type { ReactNode } from "react";

export function StatCard({ label, value, hint, accent = "text-text", icon, className = "" }: { label: string; value: ReactNode; hint?: ReactNode; accent?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <p className={`num mt-2 text-2xl font-semibold leading-none sm:text-3xl ${accent}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

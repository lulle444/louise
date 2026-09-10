export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: string }) {
  return (
    <div className="card-2 px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mono mt-1 text-xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

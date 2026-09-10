export default function Loading() {
  return (
    <div className="space-y-6 py-10" aria-busy="true" aria-live="polite">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-2" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-40 animate-pulse" />
        ))}
      </div>
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}

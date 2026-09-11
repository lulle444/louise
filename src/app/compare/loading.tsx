export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading</span>
      <div className="h-8 w-64 animate-pulse rounded-md bg-surface-2" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-48 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

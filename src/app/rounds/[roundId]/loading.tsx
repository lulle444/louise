export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading Round">
      <div className="card h-80 animate-pulse" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="card h-[32rem] animate-pulse" />
        <div className="space-y-6"><div className="card h-48 animate-pulse" /><div className="card h-64 animate-pulse" /></div>
      </div>
    </div>
  );
}

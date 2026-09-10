import { Radar } from "lucide-react";

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 border-dashed px-6 py-10 text-center">
      <span className="rounded-full bg-surface-2 p-3 text-muted">{icon ?? <Radar className="h-6 w-6" aria-hidden="true" />}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

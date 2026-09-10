import { TriangleAlert } from "lucide-react";

export function ErrorState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="card mx-auto flex max-w-lg flex-col items-center gap-3 border-coral/40 px-6 py-10 text-center">
      <span className="rounded-full bg-coral/10 p-3 text-coral">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

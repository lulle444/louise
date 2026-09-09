import Link from "next/link";
import { AlertTriangle, Inbox, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: { href: string; label: string }; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-2 text-muted">{icon ?? <Inbox className="size-5" aria-hidden />}</span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? (
        <Link href={action.href} className="mt-5 rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:brightness-110">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, retry }: { title?: string; description?: string; retry?: () => void }) {
  return (
    <div className="card flex flex-col items-center border-bear/30 px-6 py-12 text-center" role="alert">
      <span className="grid size-12 place-items-center rounded-full border border-bear/40 bg-bear/10 text-bear"><AlertTriangle className="size-5" aria-hidden /></span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {retry ? (
        <button type="button" onClick={retry} className="mt-5 rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-2">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function DataUnavailable({ what = "Price data" }: { what?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral/30 bg-neutral/5 px-3 py-2 text-sm text-neutral" role="status">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>{what} temporarily unavailable. We never show fabricated live values.</span>
    </div>
  );
}

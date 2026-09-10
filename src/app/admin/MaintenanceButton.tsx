"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { runMaintenanceAction, type AdminActionState } from "@/lib/actions/admin";

export function MaintenanceButton() {
  const [state, run, pending] = useActionState<AdminActionState, FormData>(runMaintenanceAction, { ok: true, message: "" });
  return (
    <form action={run} className="flex flex-col items-end gap-2">
      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:brightness-110 disabled:opacity-60">
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden /> {pending ? "Running…" : "Run maintenance now"}
      </button>
      {state.message ? <p className={`max-w-md text-right text-xs ${state.ok ? "text-bull" : "text-bear"}`} role="status">{state.message}</p> : null}
    </form>
  );
}

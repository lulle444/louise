"use client";

import { useActionState } from "react";
import { signInWithPassword, signUpWithPassword, type AuthState } from "@/lib/actions/auth";

export function CredentialsForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signInWithPassword : signUpWithPassword, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" ? (
        <div>
          <label htmlFor="username" className="text-sm font-semibold">Username</label>
          <input id="username" name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" className="mt-1 w-full rounded-md border border-border bg-surface-2/40 px-3 py-2 text-sm focus:border-cyan" />
          <p className="mt-1 text-[11px] text-muted">3–20 characters: letters, numbers, underscores. This is your public handle.</p>
        </div>
      ) : null}
      <div>
        <label htmlFor="email" className="text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-md border border-border bg-surface-2/40 px-3 py-2 text-sm focus:border-cyan" />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-semibold">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1 w-full rounded-md border border-border bg-surface-2/40 px-3 py-2 text-sm focus:border-cyan" />
      </div>
      {state.error ? <p className="text-sm text-bear" role="alert">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-bull" role="status">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-cyan px-4 py-2.5 text-sm font-semibold text-bg hover:brightness-110 disabled:opacity-60">
        {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

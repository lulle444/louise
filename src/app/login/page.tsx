import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { continueAsGuest, enterDemoAdmin, signInWithEmail } from "./actions";
import { DemoBadge } from "@/components/DemoBadge";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; message?: string }> }) {
  const { next = "/", error, message } = await searchParams;
  const { viewer, demo } = await getSession();
  if (viewer && !viewer.isAdmin && !demo) redirect(next);

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Virtual points only. No wallet, no deposit — just a username and a forecast.</p>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p> : null}

      {demo ? (
        <div className="card mt-6 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Demo Mode</p>
            <DemoBadge />
          </div>
          <p className="text-sm text-muted">
            Supabase credentials are not configured, so MEGASPRINT is running on deterministic demo data. Guest sessions live in this browser only.
          </p>
          <form action={continueAsGuest}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="btn btn-primary w-full" data-testid="guest-continue">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              {viewer ? "Continue as guest" : "Start a guest session"}
            </button>
          </form>
          <form action={enterDemoAdmin}>
            <input type="hidden" name="next" value={next === "/" ? "/admin" : next} />
            <button type="submit" className="btn btn-secondary w-full" data-testid="demo-admin">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Enter demo admin
            </button>
          </form>
          <p className="text-xs text-dim">In production, admin access is granted only to emails listed in ADMIN_EMAILS.</p>
        </div>
      ) : (
        <form action={signInWithEmail} className="card mt-6 space-y-4 p-5">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input mt-1" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} className="input mt-1" />
          </div>
          <button type="submit" className="btn btn-primary w-full">Sign in</button>
          <p className="text-center text-sm text-muted">
            New here?{" "}
            <Link href="/signup" className="text-cyan hover:underline">Create an account</Link>
          </p>
        </form>
      )}
    </div>
  );
}

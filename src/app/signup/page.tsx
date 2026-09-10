import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { continueAsGuest, signUpWithEmail } from "@/app/login/actions";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { demo } = await getSession();
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Pick a username. Your public profile and Race Cards live at /profile/username.</p>
      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      ) : null}
      {demo ? (
        <div className="card mt-6 space-y-4 p-5">
          <p className="text-sm text-muted">Email sign-up needs Supabase. In Demo Mode you can play as a guest right away.</p>
          <form action={continueAsGuest}>
            <input type="hidden" name="next" value="/race" />
            <button type="submit" className="btn btn-primary w-full">Continue as guest</button>
          </form>
        </div>
      ) : (
        <form action={signUpWithEmail} className="card mt-6 space-y-4 p-5">
          <div>
            <label htmlFor="displayName" className="text-sm font-medium">Display name</label>
            <input id="displayName" name="displayName" required maxLength={48} className="input mt-1" />
          </div>
          <div>
            <label htmlFor="username" className="text-sm font-medium">Username</label>
            <input id="username" name="username" required pattern="[a-z0-9._-]{3,32}" className="input mt-1" placeholder="lowercase, 3–32 chars" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input mt-1" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input mt-1" />
          </div>
          <button type="submit" className="btn btn-primary w-full">Create account</button>
          <p className="text-center text-sm text-muted">
            Already registered? <Link href="/login" className="text-cyan hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}

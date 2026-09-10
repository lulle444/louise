import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { getViewer } from "@/lib/auth/session";
import { demoSignIn } from "@/lib/actions/auth";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { CredentialsForm } from "./CredentialsForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/rounds";
  const viewer = await getViewer();
  if (viewer) redirect(next);
  const demo = isDemoMode();
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <p className="eyebrow">Sign in</p>
      <h1 className="mt-2 text-2xl font-semibold">Welcome back to Callscore</h1>
      <p className="mt-1 text-sm text-muted">No wallet needed. Virtual points only.</p>

      {demo ? (
        <div className="card mt-6 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Demo Mode sign-in</p>
            <DemoModeBadge />
          </div>
          <p className="mt-1 text-xs text-muted">Supabase credentials are not configured, so Callscore runs on seeded data. Pick an identity to try the full loop.</p>
          <div className="mt-5 space-y-3">
            <form action={demoSignIn}>
              <input type="hidden" name="kind" value="guest" />
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="w-full rounded-md bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110" data-testid="demo-guest">Continue as guest</button>
              <p className="mt-1 text-[11px] text-muted">Fresh account. Lock a forecast in today’s Round and watch the crowd reveal.</p>
            </form>
            <form action={demoSignIn}>
              <input type="hidden" name="kind" value="analyst" />
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="w-full rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-2" data-testid="demo-analyst">Sign in as Nova Reyes (analyst)</button>
              <p className="mt-1 text-[11px] text-muted">Seeded history, Call Profile, badges and settled results.</p>
            </form>
            <form action={demoSignIn}>
              <input type="hidden" name="kind" value="admin" />
              <input type="hidden" name="next" value="/admin" />
              <button type="submit" className="w-full rounded-md border border-violet/40 px-4 py-2.5 text-sm font-semibold text-violet hover:bg-violet/10" data-testid="demo-admin">Sign in as Callscore Admin</button>
              <p className="mt-1 text-[11px] text-muted">Opens the protected /admin Round console.</p>
            </form>
          </div>
        </div>
      ) : (
        <div className="card mt-6 p-6">
          <CredentialsForm mode="login" next={next} />
          <p className="mt-4 text-center text-sm text-muted">New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-cyan hover:underline">Create an account</Link></p>
        </div>
      )}
    </div>
  );
}

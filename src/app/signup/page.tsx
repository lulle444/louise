import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { getViewer } from "@/lib/auth/session";
import { CredentialsForm } from "../login/CredentialsForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/arena";
  const viewer = await getViewer();
  if (viewer) redirect(next);
  if (isDemoMode()) redirect(`/login?next=${encodeURIComponent(next)}`);
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <p className="eyebrow">Create account</p>
      <h1 className="mt-2 text-2xl font-semibold">Start your track record</h1>
      <p className="mt-1 text-sm text-muted">Email and password. No wallet, no deposits — every forecast uses virtual XP.</p>
      <div className="card mt-6 p-6">
        <CredentialsForm mode="signup" next={next} />
        <p className="mt-4 text-center text-sm text-muted">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-cyan hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}

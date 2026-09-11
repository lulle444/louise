import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, User, UserCog } from "lucide-react";
import { SignInForm } from "@/components/AuthForms";
import { Alert, PageHeader } from "@/components/ui";
import { demoSignIn } from "@/lib/actions/auth";
import { getConfig } from "@/lib/config";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const PERSONAS = [
  { persona: "guest", label: "Continue as guest", description: "Submit evidence, file corrections, and follow projects.", Icon: User },
  { persona: "moderator", label: "Continue as moderator", description: "Review the queue, change verified status, resolve disputes.", Icon: ShieldCheck },
  { persona: "admin", label: "Continue as admin", description: "Everything a moderator can do, plus integrations.", Icon: UserCog },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const user = await getSessionUser();
  if (user) redirect(next);
  const config = getConfig();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Account" title="Sign in" description="Accounts exist so submissions and moderation decisions are attributable. SHIPTRACE never connects wallets." />
      {params.error ? <Alert tone="coral">Sign-in failed. Please try again.</Alert> : null}
      {config.demoMode ? (
        <div className="card space-y-3 p-5">
          <p className="font-medium text-ink">Try SHIPTRACE as</p>
          <p className="text-sm text-slate">Pick a role to walk through the contributor or moderator experience. Email sign-in is enabled once accounts are configured.</p>
          {PERSONAS.map(({ persona, label, description, Icon }) => (
            <form key={persona} action={demoSignIn}>
              <input type="hidden" name="persona" value={persona} />
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="flex w-full items-start gap-3 rounded-lg border border-border bg-bg p-3 text-left hover:border-primary">
                <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="block text-xs text-slate">{description}</span>
                </span>
              </button>
            </form>
          ))}
        </div>
      ) : (
        <div className="card p-5">
          <SignInForm next={next} />
          <p className="mt-4 text-sm text-slate">
            No account?{" "}
            <Link href="/signup" className="text-primary underline underline-offset-4">
              Create one
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/AuthForms";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import { getConfig } from "@/lib/config";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/");
  const config = getConfig();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Account" title="Create an account" description="Contributor accounts can submit evidence, request corrections, and follow projects. Roles for moderation are assigned by admins." />
      {config.demoMode ? (
        <Alert tone="primary" title="Accounts are not enabled yet">
          <p>Sign-up opens once accounts are configured. Until then, continue with one of the roles on the sign-in page.</p>
          <div className="mt-3">
            <ButtonLink href="/login">Choose a role</ButtonLink>
          </div>
        </Alert>
      ) : (
        <div className="card p-5">
          <SignUpForm />
          <p className="mt-4 text-sm text-slate">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline underline-offset-4">
              Sign in
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

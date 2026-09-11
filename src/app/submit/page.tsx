import type { Metadata } from "next";
import Link from "next/link";
import { SubmissionForm, type SubmissionProjectOption } from "@/components/SubmissionForm";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import { getConfig } from "@/lib/config";
import { getDataSource } from "@/lib/data";
import { canSubmit } from "@/lib/domain/auth";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Submit evidence", description: "Submit public evidence, request a correction, or suggest a project. Submissions are moderated and never change verified status directly." };
export const dynamic = "force-dynamic";

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ project?: string; milestone?: string; evidence?: string; tab?: string }> }) {
  const params = await searchParams;
  const user = await getSessionUser();
  const ds = await getDataSource();
  const config = getConfig();
  const summaries = await ds.listProjectSummaries({ sort: "name" });
  const projects: SubmissionProjectOption[] = await Promise.all(
    summaries.map(async (s) => ({
      id: s.project.id,
      name: s.project.name,
      slug: s.project.slug,
      milestones: (await ds.listMilestones({ projectId: s.project.id })).map((m) => ({ id: m.id, title: m.title, status: m.status })),
    })),
  );
  const tab = params.tab === "correction" ? "correction" : params.tab === "project" ? "project" : "evidence";
  const next = `/submit?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Community" title="Submit evidence or request a correction" description="Every factual status on SHIPTRACE needs a public source URL and access timestamp. Submissions are reviewed by moderators with a written reason; they never change a verified status or Ship Score directly." />
      {!user || !canSubmit(user) ? (
        <Alert tone="primary" title="Sign in to submit">
          <p>
            Submissions are attributed to a username so decisions are accountable.{config.demoMode ? " In Demo Mode you can continue as a demo guest without creating an account." : ""}
          </p>
          <div className="mt-3">
            <ButtonLink href={`/login?next=${encodeURIComponent(next)}`}>Sign in{config.demoMode ? " or continue as demo guest" : ""}</ButtonLink>
          </div>
        </Alert>
      ) : (
        <SubmissionForm projects={projects} defaultTab={tab} defaultProjectId={params.project} defaultMilestoneId={params.milestone} defaultEvidenceId={params.evidence} isDemo={config.demoMode} />
      )}
      <div className="mt-8 grid gap-4 text-sm text-slate sm:grid-cols-3">
        <div className="card p-4">
          <p className="font-medium text-ink">What counts</p>
          <p className="mt-1 text-xs">Working products with docs, repository releases and tags, official announcements, independent reporting. Social posts alone do not prove complex delivery.</p>
        </div>
        <div className="card p-4">
          <p className="font-medium text-ink">What happens next</p>
          <p className="mt-1 text-xs">A moderator accepts, rejects, or requests clarification with a public reason. Accepted evidence can then support a verified status change.</p>
        </div>
        <div className="card p-4">
          <p className="font-medium text-ink">Rate limits and safety</p>
          <p className="mt-1 text-xs">Five submissions per ten minutes. Only http(s) links to public hosts. Submitted text is stored as plain text and never rendered as HTML.</p>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate">
        Read the{" "}
        <Link href="/methodology" className="text-primary underline underline-offset-4">
          methodology
        </Link>{" "}
        for the evidence hierarchy and moderation process.
      </p>
    </div>
  );
}

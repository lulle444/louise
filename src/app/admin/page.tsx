import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Database, GitBranch, Globe, ShieldCheck } from "lucide-react";
import { ApprovalForm, MilestoneForm, ProjectForm, RecalculateForm } from "@/components/AdminForms";
import { DemoBadge } from "@/components/DemoBadge";
import { DisputeResolutionCard, ModerationQueue, type QueueEvidenceItem } from "@/components/ModerationQueue";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, EmptyState, PageHeader, Pill, SectionHeading, Stat } from "@/components/ui";
import { getConfig } from "@/lib/config";
import { getDataSource } from "@/lib/data";
import { isAdmin, isModerator } from "@/lib/domain/auth";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  ["queue", "Evidence queue"],
  ["disputes", "Disputes"],
  ["projects", "Projects & milestones"],
  ["scores", "Scores"],
  ["integrations", "Integrations & freshness"],
  ["audit", "Audit log"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; project?: string }> }) {
  const user = await getSessionUser();
  // Server-side protection: ordinary users and guests are redirected before any admin data is loaded.
  if (!user) redirect("/login?next=/admin");
  if (!isModerator(user)) redirect("/?denied=admin");
  const params = await searchParams;
  const tab: Tab = (TABS.find(([t]) => t === params.tab)?.[0] ?? "queue") as Tab;
  const ds = await getDataSource();
  const config = getConfig();
  const [stats, summaries, pending, clarification, disputes, suggestions, integrations, audit] = await Promise.all([
    ds.getStats(),
    ds.listProjectSummaries({ includeUnpublished: true, sort: "name" }),
    ds.listEvidence({ reviewState: "pending" }),
    ds.listEvidence({ reviewState: "needs_clarification" }),
    ds.listDisputes(),
    ds.listProjectSuggestions(),
    ds.getIntegrationStatus(),
    ds.listAdminAudit(60),
  ]);
  const projectsById = new Map(summaries.map((s) => [s.project.id, s.project]));
  const queueItems: QueueEvidenceItem[] = await Promise.all(
    [...pending, ...clarification].map(async (evidence) => ({
      evidence,
      projectName: projectsById.get(evidence.projectId)?.name ?? "Unknown project",
      projectSlug: projectsById.get(evidence.projectId)?.slug ?? "",
      milestone: evidence.milestoneId ? await ds.getMilestone(evidence.milestoneId) : null,
    })),
  );
  const selectedProject = params.project ? projectsById.get(params.project) ?? null : null;
  const selectedMilestones = selectedProject ? await ds.listMilestones({ projectId: selectedProject.id }) : [];
  const openDisputes = disputes.filter((d) => d.state === "open" || d.state === "under_review");
  const recentReviews = audit.filter((a) => a.action === "evidence.review").slice(0, 5);
  const closedDisputes = disputes.filter((d) => d.state === "resolved" || d.state === "rejected");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Moderation workspace" title="Admin">
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate">
          <ShieldCheck className="h-4 w-4 text-mint" aria-hidden="true" />
          Signed in as {user.displayName} ({user.role}). Every action requires a reason and is written to the audit log. Material history is never deleted.
          {config.demoMode ? <DemoBadge /> : null}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending evidence" value={stats.pendingEvidence} />
        <Stat label="Open disputes" value={stats.openDisputes} />
        <Stat label="Projects" value={summaries.length} hint={`${stats.projects} published`} />
        <Stat label="Project suggestions" value={suggestions.filter((s) => s.state === "pending").length} />
      </div>

      <nav aria-label="Admin sections" className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/admin?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={tab === key ? "rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white" : "rounded-md px-3 py-1.5 text-sm text-slate hover:bg-surface-2 hover:text-ink"}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "queue" ? (
        <section aria-labelledby="queue-h">
          <SectionHeading id="queue-h" eyebrow="Review" title={`Evidence awaiting review (${queueItems.length})`} description="Accept, reject, or request clarification. Accepting evidence recalculates the project's Ship Score; it does not change milestone status by itself." />
          <ModerationQueue items={queueItems} />
          {recentReviews.length ? (
            <div className="mt-6 rounded-lg border border-border bg-surface p-4" role="status" aria-live="polite">
              <p className="text-xs uppercase tracking-wider text-slate">Recently decided</p>
              <ul className="mt-2 space-y-1 text-sm">
                {recentReviews.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 text-slate">
                    <span className="font-mono text-xs text-slate-dim">{formatDateTime(a.createdAt)}</span>
                    <span className="text-ink">Evidence marked {String((a.after as { reviewState?: string } | null)?.reviewState ?? "").replace("_", " ")}</span>
                    <span>· {a.reason}</span>
                    <Link href={`/proof/${a.targetId}`} className="text-primary hover:underline">
                      proof card
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {suggestions.length ? (
            <div className="mt-8">
              <SectionHeading eyebrow="Intake" title={`Project suggestions (${suggestions.length})`} />
              <ul className="divide-y divide-border rounded-[14px] border border-border bg-surface">
                {suggestions.map((s) => (
                  <li key={s.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{s.name}</span>
                      <Pill tone="neutral">{s.category}</Pill>
                      <Pill tone={s.state === "pending" ? "amber" : "neutral"}>{s.state}</Pill>
                      <span className="font-mono text-xs text-slate">{formatDate(s.createdAt)} · {s.submitterName}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate">{s.description}</p>
                    <p className="mt-1 font-mono text-xs text-slate-dim">
                      {s.officialUrl} · roadmap {s.roadmapUrl}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "disputes" ? (
        <section aria-labelledby="disputes-h" className="space-y-8">
          <div>
            <SectionHeading id="disputes-h" eyebrow="Corrections" title={`Open disputes and corrections (${openDisputes.length})`} description="Record a resolution with a public note. To change a milestone's status, use the moderator tools in its Evidence Room." />
            {openDisputes.length ? (
              <div className="space-y-4">
                {openDisputes.map((d) => (
                  <DisputeResolutionCard key={d.id} dispute={d} projectName={projectsById.get(d.projectId)?.name ?? "Unknown"} projectSlug={projectsById.get(d.projectId)?.slug ?? ""} milestoneTitle={null} />
                ))}
              </div>
            ) : (
              <EmptyState title="No open disputes" />
            )}
          </div>
          <div>
            <SectionHeading eyebrow="History" title={`Closed (${closedDisputes.length})`} />
            <div className="space-y-4">
              {closedDisputes.map((d) => (
                <DisputeResolutionCard key={d.id} dispute={d} projectName={projectsById.get(d.projectId)?.name ?? "Unknown"} projectSlug={projectsById.get(d.projectId)?.slug ?? ""} milestoneTitle={null} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "projects" ? (
        <section aria-labelledby="projects-h" className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div>
              <SectionHeading id="projects-h" eyebrow="Catalogue" title="Projects" />
              <ul className="divide-y divide-border rounded-[14px] border border-border bg-surface">
                {summaries.map((s) => (
                  <li key={s.project.id}>
                    <Link href={`/admin?tab=projects&project=${s.project.id}`} className={`flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-surface-2 ${selectedProject?.id === s.project.id ? "bg-surface-2 text-ink" : "text-slate"}`}>
                      <span>{s.project.name}</span>
                      <Pill tone={s.project.status === "published" ? "mint" : "amber"}>{s.project.status}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <div className="card p-5">
                <SectionHeading eyebrow={selectedProject ? "Edit" : "Create"} title={selectedProject ? selectedProject.name : "New project"} />
                <ProjectForm key={selectedProject?.id ?? "new"} project={selectedProject ?? undefined} />
                {selectedProject ? (
                  <p className="mt-3 text-xs text-slate">
                    <Link href="/admin?tab=projects" className="text-primary underline underline-offset-4">
                      Switch to creating a new project
                    </Link>
                  </p>
                ) : null}
              </div>
              {selectedProject ? (
                <div className="card p-5">
                  <SectionHeading eyebrow="Milestones" title={`${selectedMilestones.length} recorded`} description="Approve milestones to include them in scoring. Change status from the milestone's Evidence Room." />
                  <ul className="space-y-3">
                    {selectedMilestones.map((m) => (
                      <li key={m.id} className="rounded-lg border border-border bg-bg p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/projects/${selectedProject.slug}/milestones/${m.id}`} className="text-sm font-medium text-ink hover:text-primary">
                            {m.title}
                          </Link>
                          <StatusBadge status={m.status} />
                          <Pill tone={m.moderatorApproved ? "mint" : "amber"}>{m.moderatorApproved ? "scored" : "not scored"}</Pill>
                          <span className="font-mono text-xs text-slate">
                            {m.importance} · due {formatDate(m.deadline)}
                          </span>
                        </div>
                        <div className="mt-2">
                          <ApprovalForm milestoneId={m.id} approved={m.moderatorApproved} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
          <div className="card p-5">
            <SectionHeading eyebrow="Create" title="New milestone from a cited source" description="Milestones are created as planned and unapproved. Paraphrase the commitment; do not paste large copyrighted passages." />
            <MilestoneForm projects={summaries.map((s) => ({ id: s.project.id, name: s.project.name }))} />
          </div>
        </section>
      ) : null}

      {tab === "scores" ? (
        <section aria-labelledby="scores-h" className="space-y-6">
          <div className="card p-5">
            <SectionHeading id="scores-h" eyebrow="Ship Score" title="Recalculate with a chosen formula version" description="Recalculation appends new snapshots. Historical snapshots are never rewritten." />
            <RecalculateForm projects={summaries.map((s) => ({ id: s.project.id, name: s.project.name }))} />
          </div>
          <div className="overflow-x-auto">
            <table className="data w-full text-sm">
              <caption className="sr-only">Latest score snapshot per project</caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Total</th>
                  <th scope="col">Formula</th>
                  <th scope="col">Completeness</th>
                  <th scope="col">Calculated</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.project.id}>
                    <td>
                      <Link href={`/projects/${s.project.slug}`} className="text-ink hover:text-primary">
                        {s.project.name}
                      </Link>
                    </td>
                    <td className="font-mono">{s.score?.total ?? "insufficient"}</td>
                    <td className="font-mono">{s.score?.formulaVersion ?? "—"}</td>
                    <td className="font-mono">{s.score ? `${Math.round(s.score.dataCompleteness * 100)}%` : "—"}</td>
                    <td className="font-mono text-slate">{s.score ? formatDateTime(s.score.calculatedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "integrations" ? (
        <section aria-labelledby="integrations-h" className="space-y-6">
          <SectionHeading id="integrations-h" eyebrow="Data sources" title="Integrations and data freshness" description="Scheduled jobs run under /api/cron/* with CRON_SECRET. Missing keys disable a provider safely instead of breaking the site." />
          {!isAdmin(user) ? <Alert tone="neutral">Only admins can change integration settings. Moderators can view status.</Alert> : null}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <p className="flex items-center gap-2 font-medium text-ink">
                <GitBranch className="h-4 w-4 text-primary" aria-hidden="true" /> GitHub metadata
              </p>
              <dl className="mt-3 space-y-1 text-sm text-slate">
                <div className="flex justify-between"><dt>Configured</dt><dd className={integrations.github.configured ? "text-mint" : "text-amber"}>{integrations.github.configured ? "yes" : "no (GITHUB_TOKEN missing)"}</dd></div>
                <div className="flex justify-between"><dt>Repositories</dt><dd className="font-mono">{integrations.github.repositories}</dd></div>
                <div className="flex justify-between"><dt>Last retrieved</dt><dd className="font-mono">{integrations.github.lastRetrievedAt ? formatRelative(integrations.github.lastRetrievedAt) : "never"}</dd></div>
              </dl>
            </div>
            <div className="card p-5">
              <p className="flex items-center gap-2 font-medium text-ink">
                <Globe className="h-4 w-4 text-primary" aria-hidden="true" /> Website health
              </p>
              <dl className="mt-3 space-y-1 text-sm text-slate">
                <div className="flex justify-between"><dt>Configured</dt><dd className={integrations.website.configured ? "text-mint" : "text-amber"}>{integrations.website.configured ? "yes" : "no (WEBSITE_CHECK_SECRET missing)"}</dd></div>
                <div className="flex justify-between"><dt>Approved endpoints</dt><dd className="font-mono">{integrations.website.endpoints}</dd></div>
                <div className="flex justify-between"><dt>Last check</dt><dd className="font-mono">{integrations.website.lastCheckedAt ? formatRelative(integrations.website.lastCheckedAt) : "never"}</dd></div>
                <div className="flex justify-between"><dt>Failed checks (7d)</dt><dd className="font-mono">{integrations.website.recentFailures}</dd></div>
              </dl>
            </div>
            <div className="card p-5">
              <p className="flex items-center gap-2 font-medium text-ink">
                <Database className="h-4 w-4 text-primary" aria-hidden="true" /> Score snapshots
              </p>
              <dl className="mt-3 space-y-1 text-sm text-slate">
                <div className="flex justify-between"><dt>Data source</dt><dd className="font-mono">{ds.mode}</dd></div>
                <div className="flex justify-between"><dt>Last calculated</dt><dd className="font-mono">{integrations.scores.lastCalculatedAt ? formatRelative(integrations.scores.lastCalculatedAt) : "never"}</dd></div>
                <div className="flex justify-between"><dt>Formula</dt><dd className="font-mono">{integrations.scores.formulaVersion ?? "—"}</dd></div>
              </dl>
            </div>
          </div>
          <Alert tone="amber" title="Failed checks">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {integrations.website.recentFailures} failed website checks in the last seven days. Failed checks are observations and never change a verified status.
            </p>
          </Alert>
          <div className="card p-5 text-sm text-slate">
            <p className="font-medium text-ink">Constituent sources</p>
            <p className="mt-1">Repositories and endpoints are managed per project in the database (tables <code className="font-mono text-xs">github_repositories</code> and <code className="font-mono text-xs">website_endpoints</code>); only approved endpoints are checked. Provider abstractions live under <code className="font-mono text-xs">src/lib/providers</code> so additional sources can be added without touching scoring.</p>
          </div>
        </section>
      ) : null}

      {tab === "audit" ? (
        <section aria-labelledby="audit-h">
          <SectionHeading id="audit-h" eyebrow="Immutable" title={`Audit log (latest ${audit.length})`} description="Every moderator action with actor, reason, and before/after state." />
          <div className="overflow-x-auto">
            <table className="data w-full text-sm">
              <caption className="sr-only">Admin audit log</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Change</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap font-mono text-xs text-slate">{formatDateTime(a.createdAt)}</td>
                    <td className="text-ink">{a.actorName}</td>
                    <td className="font-mono text-xs">{a.action}</td>
                    <td className="font-mono text-xs text-slate">
                      {a.targetType} {a.targetId.slice(0, 24)}
                    </td>
                    <td className="max-w-md text-slate">{a.reason}</td>
                    <td className="font-mono text-xs text-slate">
                      {a.before ? JSON.stringify(a.before) : "—"} → {a.after ? JSON.stringify(a.after) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

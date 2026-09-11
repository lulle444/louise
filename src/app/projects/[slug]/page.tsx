import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, GitCompareArrows, Globe, Scale } from "lucide-react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { DataFreshness } from "@/components/DataFreshness";
import { DemoBadge } from "@/components/DemoBadge";
import { EvidenceCard } from "@/components/EvidenceCard";
import { MilestoneCard } from "@/components/MilestoneCard";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScoreHistoryChart } from "@/components/ScoreHistoryChart";
import { ShipScoreGauge } from "@/components/ShipScoreGauge";
import { FEED_TYPE_META } from "@/components/ShippingFeed";
import { SourceChip } from "@/components/SourceChip";
import { StatusBadge } from "@/components/StatusBadge";
import { WatchButton } from "@/components/WatchButton";
import { ButtonLink, EmptyState, Pill, SectionHeading, cn } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { canSubmit } from "@/lib/domain/auth";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ds = await getDataSource();
  const project = await ds.getProjectBySlug(slug);
  if (!project) return { title: "Project not found" };
  return { title: project.name, description: `${project.name} on SHIPTRACE: milestones, evidence, and Ship Score. ${project.description}` };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ds = await getDataSource();
  const [bundle, user] = await Promise.all([ds.getProjectBundle(slug), getSessionUser()]);
  if (!bundle || bundle.project.status !== "published") notFound();
  const { project, milestones, statusEvents, evidence, disputes, scoreHistory, latestScore, githubRepositories, githubSnapshots, endpoints, websiteChecks, feedEvents } = bundle;
  const watchlist = user ? await ds.getWatchlistForUser(user.id) : null;
  const watching = !!watchlist?.items.some((i) => i.projectId === project.id);
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = milestones.filter((m) => m.deadline >= today && m.status !== "shipped" && m.status !== "cancelled");
  const shipped = milestones.filter((m) => m.status === "shipped" || m.status === "partially_shipped");
  const attention = milestones.filter((m) => m.status === "delayed" || m.status === "no_evidence" || m.status === "disputed" || m.status === "cancelled");
  const evidenceFor = (id: string) => evidence.filter((e) => e.milestoneId === id);
  const eventsFor = (id: string) => statusEvents.filter((e) => e.milestoneId === id);
  const latestGh = githubSnapshots.at(-1) ?? null;
  const recentChecks = websiteChecks.slice(-60);
  const openDisputes = disputes.filter((d) => d.state === "open" || d.state === "under_review");

  return (
    <div className="space-y-12">
      <header className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="primary">{project.category}</Pill>
              <span className="text-sm text-slate">{project.ecosystem}</span>
              {project.isDemo ? <DemoBadge /> : null}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-bg font-mono text-lg text-primary" aria-hidden="true">
                {project.name.slice(0, 2).toUpperCase()}
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{project.name}</h1>
            </div>
            <p className="mt-3 max-w-2xl text-slate">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.links.map((l) => (
                <SourceChip key={l.id} url={l.url} label={l.label} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-xs text-slate">
              <span>Last verified update {project.lastVerifiedAt ? `${formatDate(project.lastVerifiedAt)} (${formatRelative(project.lastVerifiedAt)})` : "—"}</span>
              <DataFreshness checkedAt={recentChecks.at(-1)?.checkedAt ?? latestGh?.retrievedAt ?? project.updatedAt} />
            </div>
          </div>
          <div className="flex w-full flex-col items-center gap-3 sm:w-auto">
            <ShipScoreGauge total={latestScore?.total ?? null} size={128} />
            {latestScore ? <ConfidenceBadge confidence={latestScore.confidence} dataCompleteness={latestScore.dataCompleteness} /> : null}
            <div className="flex flex-wrap justify-center gap-2">
              <WatchButton projectId={project.id} initialWatching={watching} signedIn={canSubmit(user)} path={`/projects/${project.slug}`} />
              <ButtonLink href={`/compare?projects=${project.slug}`} variant="secondary">
                <GitCompareArrows className="h-4 w-4" aria-hidden="true" /> Compare
              </ButtonLink>
            </div>
          </div>
        </div>
        <nav aria-label="Profile sections" className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4 text-xs">
          {[
            ["#score", "Score breakdown"],
            ["#timeline", "Timeline"],
            ["#upcoming", "Upcoming"],
            ["#shipped", "Shipped"],
            ["#attention", "Delayed / no evidence"],
            ["#development", "Development pulse"],
            ["#product", "Product status"],
            ["#evidence", "Evidence feed"],
            ["#changelog", "Change log"],
            ["#methodology", "Methodology & corrections"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-md border border-border px-2.5 py-1 text-slate hover:border-border-strong hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section id="score" aria-labelledby="score-h" className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <SectionHeading id="score-h" eyebrow="Ship Score" title="Score breakdown" />
          <ScoreBreakdown snapshot={latestScore} />
        </div>
        <div className="card p-5">
          <p className="eyebrow">Score history</p>
          <p className="mt-1 text-sm text-slate">{scoreHistory.length} stored snapshots</p>
          <div className="mt-3">
            <ScoreHistoryChart history={scoreHistory} />
          </div>
        </div>
      </section>

      <section id="timeline" aria-labelledby="timeline-h">
        <SectionHeading id="timeline-h" eyebrow="Roadmap" title="Timeline of milestones" description={`${milestones.length} commitments recorded from cited public sources, ordered by deadline.`} />
        {milestones.length ? <MilestoneTimeline milestones={milestones} projectSlug={project.slug} /> : <EmptyState title="No milestones recorded yet" />}
      </section>

      <section id="upcoming" aria-labelledby="upcoming-h">
        <SectionHeading id="upcoming-h" eyebrow="Open commitments" title="Upcoming commitments" description="Deadlines that have not passed. Community evidence can be submitted at any time." />
        {upcoming.length ? (
          <div className="grid gap-4">
            {upcoming.map((m) => (
              <MilestoneCard key={m.id} milestone={m} projectSlug={project.slug} evidence={evidenceFor(m.id)} events={eventsFor(m.id)} />
            ))}
          </div>
        ) : (
          <EmptyState title="No upcoming commitments" description="The project has no public deadlines ahead in our records." />
        )}
      </section>

      <section id="shipped" aria-labelledby="shipped-h">
        <SectionHeading id="shipped-h" eyebrow="Verified from public evidence" title="Shipped items" description={`${shipped.length} milestones verified as shipped or partially shipped.`} />
        {shipped.length ? (
          <div className="grid gap-4">
            {shipped.map((m) => (
              <MilestoneCard key={m.id} milestone={m} projectSlug={project.slug} evidence={evidenceFor(m.id)} events={eventsFor(m.id)} />
            ))}
          </div>
        ) : (
          <EmptyState title="No verified shipments yet" />
        )}
      </section>

      <section id="attention" aria-labelledby="attention-h">
        <SectionHeading id="attention-h" eyebrow="Neutral record" title="Delayed, no-evidence, disputed and cancelled items" description="A missed deadline or missing evidence is recorded as such. It is not a conclusion about the project's intent." />
        {attention.length ? (
          <div className="grid gap-4">
            {attention.map((m) => (
              <MilestoneCard key={m.id} milestone={m} projectSlug={project.slug} evidence={evidenceFor(m.id)} events={eventsFor(m.id)} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing outstanding" description="No delayed, unevidenced, disputed or cancelled items in the record." />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section id="development" aria-labelledby="dev-h">
          <SectionHeading id="dev-h" eyebrow="Automated observation" title="Development pulse" />
          <div className="card p-5">
            {githubRepositories.length === 0 ? (
              <p className="text-sm text-slate">No public repository is listed by the project. The development continuity component is excluded from the score rather than assumed.</p>
            ) : latestGh ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                  {githubRepositories.map((r) => (
                    <SourceChip key={r.id} url={r.url} label={`${r.owner}/${r.repo}`} />
                  ))}
                  <span className="stamp text-slate">{latestGh.source === "demo" ? "demo observation" : "GitHub API"}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate">Active weeks (of 12)</dt>
                    <dd className="font-mono text-ink">{latestGh.activeWeeksLast12}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate">Releases / tags (90d)</dt>
                    <dd className="font-mono text-ink">
                      {latestGh.releasesLast90d} / {latestGh.tagsLast90d}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate">Latest release</dt>
                    <dd className="font-mono text-ink">{latestGh.latestReleaseTag ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate">Last push</dt>
                    <dd className="font-mono text-ink">{latestGh.lastPushAt ? formatRelative(latestGh.lastPushAt) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate">Default branch</dt>
                    <dd className="font-mono text-ink">{latestGh.defaultBranch ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate">Retrieved</dt>
                    <dd className="font-mono text-ink">{formatDateTime(latestGh.retrievedAt)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-end gap-1" aria-label={`Weekly activity for the last ${githubSnapshots.length} snapshots`} role="img">
                  {githubSnapshots.slice(-12).map((s) => (
                    <span key={s.id} title={`${formatDate(s.retrievedAt)}: ${s.activeWeeksLast12}/12 active weeks`} className="w-full rounded-sm bg-primary/70" style={{ height: `${8 + (s.activeWeeksLast12 / 12) * 32}px` }} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate">Repository activity is an observation, not proof of delivery. Commit counts alone never verify a milestone.</p>
              </>
            ) : (
              <p className="text-sm text-slate">Repository listed; no snapshot retrieved yet.</p>
            )}
          </div>
        </section>

        <section id="product" aria-labelledby="product-h">
          <SectionHeading id="product-h" eyebrow="Automated observation" title="Product status" />
          <div className="card p-5">
            {endpoints.length === 0 ? (
              <p className="text-sm text-slate">No approved product endpoints listed. Availability is excluded from the score rather than assumed.</p>
            ) : (
              <ul className="space-y-4">
                {endpoints.map((ep) => {
                  const checks = websiteChecks.filter((c) => c.endpointId === ep.id).slice(-30);
                  const okRate = checks.length ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100) : null;
                  const last = checks.at(-1);
                  return (
                    <li key={ep.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm text-ink">
                          <Globe className="h-4 w-4 text-slate" aria-hidden="true" />
                          {ep.label}
                        </span>
                        <span className="font-mono text-xs text-slate">
                          {okRate === null ? "no checks" : `${okRate}% ok · last 30 checks`}
                          {last ? ` · ${last.ok ? `${last.httpStatus} in ${last.latencyMs} ms` : "last check failed"} · ${formatRelative(last.checkedAt)}` : ""}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-0.5" role="img" aria-label={`${ep.label}: ${okRate ?? 0}% of recent checks succeeded`}>
                        {checks.map((c) => (
                          <span key={c.id} className={cn("h-3 w-full rounded-sm", c.ok ? "bg-mint/70" : "bg-coral/70")} title={`${formatDateTime(c.checkedAt)} · ${c.ok ? `HTTP ${c.httpStatus}` : (c.error ?? "failed")}`} />
                        ))}
                      </div>
                      <div className="mt-1">
                        <SourceChip url={ep.url} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-slate">One failed check never proves abandonment. Availability uses a rolling window with neutral labels.</p>
          </div>
        </section>
      </div>

      <section id="evidence" aria-labelledby="evidence-h">
        <SectionHeading
          id="evidence-h"
          eyebrow="Sources"
          title="Evidence feed"
          description="Accepted evidence is verified; pending community submissions are visibly unverified until a moderator decides."
          action={
            <ButtonLink href={`/submit?project=${project.id}`} variant="secondary">
              Submit evidence
            </ButtonLink>
          }
        />
        {evidence.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {evidence.slice(0, 8).map((e) => (
              <EvidenceCard key={e.id} evidence={e} />
            ))}
          </div>
        ) : (
          <EmptyState title="No evidence records yet" action={<ButtonLink href={`/submit?project=${project.id}`}>Submit the first evidence</ButtonLink>} />
        )}
      </section>

      <section id="changelog" aria-labelledby="changelog-h">
        <SectionHeading id="changelog-h" eyebrow="Audit trail" title="Change log" description="Every verified status change, new commitment, deadline change and accepted evidence for this project." />
        <ol className="divide-y divide-border rounded-[14px] border border-border bg-surface">
          {feedEvents.slice(0, 25).map((event) => {
            const meta = FEED_TYPE_META[event.type];
            return (
              <li key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn("stamp shrink-0", meta.tone)}>{meta.label}</span>
                <div className="min-w-0 flex-1">
                  <Link href={event.milestoneId ? `/projects/${project.slug}/milestones/${event.milestoneId}` : `#`} className="text-sm text-ink hover:text-primary">
                    {event.title}
                  </Link>
                </div>
                <time dateTime={event.occurredAt} className="font-mono text-xs text-slate">
                  {formatDate(event.occurredAt)}
                </time>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="methodology" aria-labelledby="method-h" className="card p-6">
        <SectionHeading id="method-h" eyebrow="Corrections" title="Methodology and correction process" />
        <div className="grid gap-4 text-sm text-slate md:grid-cols-2">
          <div>
            <p>
              Statuses are set only by moderators, with a written reason and evidence references, following the published{" "}
              <Link href="/methodology" className="text-primary underline underline-offset-4">
                methodology
              </Link>
              . Automated checks create observations, never conclusions.
            </p>
            <p className="mt-2">Project claims, community submissions, automated observations and moderator conclusions are labelled separately throughout this page.</p>
          </div>
          <div>
            <p className="flex items-start gap-2">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
              <span>
                Believe something here is wrong? Anyone — including project representatives — can{" "}
                <Link href={`/submit?project=${project.id}&tab=correction`} className="text-primary underline underline-offset-4">
                  request a correction
                </Link>
                . Prior decisions remain in the audit history.
              </span>
            </p>
            {openDisputes.length ? (
              <ul className="mt-3 space-y-2">
                {openDisputes.map((d) => (
                  <li key={d.id} className="rounded-lg border border-violet/30 bg-violet-soft/40 p-3 text-xs">
                    <span className="font-mono uppercase tracking-wider text-violet">{d.kind} · {d.state.replace("_", " ")}</span>
                    <p className="mt-1 text-slate">{d.claim.slice(0, 200)}{d.claim.length > 200 ? "…" : ""}</p>
                    <p className="mt-1 text-slate-dim">
                      filed {formatDate(d.createdAt)} by {d.submitterName}
                      {d.milestoneId ? (
                        <>
                          {" · "}
                          <Link href={`/projects/${project.slug}/milestones/${d.milestoneId}`} className="text-primary">
                            milestone
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <StatusBadge status="shipped" /> <StatusBadge status="partially_shipped" /> <StatusBadge status="delayed" /> <StatusBadge status="no_evidence" /> <StatusBadge status="disputed" /> <StatusBadge status="cancelled" />
        </div>
      </section>
    </div>
  );
}

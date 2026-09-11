import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarClock, FileCheck2, TrendingUp } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { FEED_TYPE_META } from "@/components/ShippingFeed";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, EmptyState, PageHeader, SectionHeading, cn } from "@/components/ui";
import { setWatchlistVisibility } from "@/lib/actions/watchlist";
import { getDataSource } from "@/lib/data";
import { canSubmit } from "@/lib/domain/auth";
import { formatDate, formatRelative } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Watchlist", description: "Follow projects and see new milestones, approaching deadlines, evidence, and score changes. No holdings, prices, or trading." };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function WatchlistPage() {
  const user = await getSessionUser();
  if (!user || !canSubmit(user)) redirect("/login?next=/watchlist");
  const ds = await getDataSource();
  const list = await ds.getWatchlistForUser(user.id);
  const summaries = await ds.listProjectSummaries({ sort: "name" });
  const followed = summaries.filter((s) => list?.items.some((i) => i.projectId === s.project.id));
  const followedIds = new Set(followed.map((s) => s.project.id));
  const now = new Date();
  const feed = (await ds.listFeedEvents({ limit: 200, verifiedOnly: true })).filter((e) => followedIds.has(e.projectId)).slice(0, 20);
  const upcoming = (await ds.listMilestones({ dueAfter: now.toISOString().slice(0, 10), dueBefore: new Date(now.getTime() + 30 * DAY).toISOString().slice(0, 10) })).filter((m) => followedIds.has(m.projectId));
  const scoreChanges = (
    await Promise.all(
      followed.map(async (s) => {
        const history = await ds.listScoreHistory(s.project.id);
        const latest = history.at(-1);
        const prev = history.at(-2);
        return latest && prev ? { project: s.project, latest, prev, delta: (latest.total ?? 0) - (prev.total ?? 0) } : null;
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);
  const projectsById = new Map(summaries.map((s) => [s.project.id, s.project]));

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Following" title="Your watchlist" description="New milestones, approaching deadlines, accepted evidence and score changes for projects you follow. SHIPTRACE never shows holdings, prices, profit and loss, or trade actions.">
        <form action={setWatchlistVisibility} className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate">
          <span>Visibility: {list?.watchlist.isPublic ? "public on your profile" : "private"}</span>
          <input type="hidden" name="isPublic" value={list?.watchlist.isPublic ? "false" : "true"} />
          <button type="submit" className="rounded-md border border-border px-3 py-1 text-xs text-ink hover:border-border-strong">
            Make {list?.watchlist.isPublic ? "private" : "public"}
          </button>
        </form>
      </PageHeader>

      {followed.length === 0 ? (
        <EmptyState title="You are not following any projects yet" description="Use the Follow button on any project profile." action={<Link href="/projects" className="text-sm text-primary underline underline-offset-4">Browse projects</Link>} />
      ) : (
        <>
          <section aria-labelledby="followed-h">
            <SectionHeading id="followed-h" eyebrow="Projects" title={`Following ${followed.length}`} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {followed.map((s) => (
                <ProjectCard key={s.project.id} summary={s} />
              ))}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="deadlines-h">
              <SectionHeading id="deadlines-h" eyebrow="Next 30 days" title="Approaching deadlines" />
              {upcoming.length ? (
                <ol className="divide-y divide-border rounded-[14px] border border-border bg-surface">
                  {upcoming.map((m) => {
                    const p = projectsById.get(m.projectId);
                    return (
                      <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <CalendarClock className="h-4 w-4 text-slate" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <Link href={p ? `/projects/${p.slug}/milestones/${m.id}` : "#"} className="text-sm font-medium text-ink hover:text-primary">
                            {m.title}
                          </Link>
                          <p className="font-mono text-xs text-slate">
                            {p?.name} · {formatDate(m.deadline)} · {formatRelative(m.deadline)}
                          </p>
                        </div>
                        <StatusBadge status={m.status} />
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <Alert tone="neutral">No deadlines in the next 30 days for followed projects.</Alert>
              )}
            </section>

            <section aria-labelledby="scores-h">
              <SectionHeading id="scores-h" eyebrow="Latest snapshots" title="Score changes" />
              <ol className="divide-y divide-border rounded-[14px] border border-border bg-surface">
                {scoreChanges.map((c) => (
                  <li key={c.project.id} className="flex items-center gap-3 px-4 py-3">
                    <TrendingUp className="h-4 w-4 text-slate" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/projects/${c.project.slug}`} className="text-sm font-medium text-ink hover:text-primary">
                        {c.project.name}
                      </Link>
                      <p className="font-mono text-xs text-slate">
                        {c.prev.total ?? "insufficient"} → {c.latest.total ?? "insufficient"} · {c.latest.formulaVersion} · {formatDate(c.latest.calculatedAt)}
                      </p>
                    </div>
                    <span className={cn("font-mono text-sm", c.delta > 0 ? "text-mint" : c.delta < 0 ? "text-coral" : "text-slate")}>{c.delta > 0 ? `+${c.delta}` : c.delta}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section aria-labelledby="activity-h">
            <SectionHeading id="activity-h" eyebrow="Activity" title="Recent verified events" />
            {feed.length ? (
              <ol className="divide-y divide-border rounded-[14px] border border-border bg-surface">
                {feed.map((e) => {
                  const p = projectsById.get(e.projectId);
                  const meta = FEED_TYPE_META[e.type];
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      {e.type === "evidence_added" ? <FileCheck2 className="h-4 w-4 text-violet" aria-hidden="true" /> : <Bell className="h-4 w-4 text-slate" aria-hidden="true" />}
                      <span className={cn("stamp", meta.tone)}>{meta.label}</span>
                      <Link href={p && e.milestoneId ? `/projects/${p.slug}/milestones/${e.milestoneId}` : p ? `/projects/${p.slug}` : "#"} className="min-w-0 flex-1 text-sm text-ink hover:text-primary">
                        {e.title}
                      </Link>
                      <span className="font-mono text-xs text-slate">{formatRelative(e.occurredAt)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <Alert tone="neutral">No verified events yet for followed projects.</Alert>
            )}
          </section>
        </>
      )}
    </div>
  );
}

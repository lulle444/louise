import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, Clock3, GitCompareArrows, Scale, Users } from "lucide-react";
import { DataFreshness } from "@/components/DataFreshness";
import { DemoBadge } from "@/components/DemoBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectSearch } from "@/components/ProjectSearch";
import { FEED_TYPE_META } from "@/components/ShippingFeed";
import { ShipScoreGauge } from "@/components/ShipScoreGauge";
import { SourceChip } from "@/components/SourceChip";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink, Card, SectionHeading, cn } from "@/components/ui";
import { getConfig } from "@/lib/config";
import { getDataSource } from "@/lib/data";
import { FORMULA_V1 } from "@/lib/domain/score";
import { formatDate, formatRelative, isoDateOnly } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ds = await getDataSource();
  const config = getConfig();
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const [summaries, shipped, dueThisWeek, attention, evidenceActivity, stats] = await Promise.all([
    ds.listProjectSummaries({ sort: "score" }),
    ds.listFeedEvents({ types: ["shipped", "partially_shipped"], limit: 5, verifiedOnly: true }),
    ds.listMilestones({ dueAfter: isoDateOnly(now), dueBefore: isoDateOnly(weekAhead) }),
    ds.listFeedEvents({ types: ["delayed", "no_evidence"], limit: 4, verifiedOnly: true }),
    ds.listEvidence({ limit: 6 }),
    ds.getStats(),
  ]);
  const projects = new Map(summaries.map((s) => [s.project.id, s.project]));
  const consistent = summaries.filter((s) => s.score?.total !== null && s.score !== null).slice(0, 4);
  const compareTrio = summaries.slice(0, 3).map((s) => s.project.slug);
  const trendingComparisons = [
    { label: "Top three by Ship Score", slugs: compareTrio },
    { label: "Layer 1 vs Layer 2", slugs: summaries.filter((s) => s.project.category === "L1" || s.project.category === "L2").slice(0, 3).map((s) => s.project.slug) },
    { label: "Infrastructure providers", slugs: summaries.filter((s) => s.project.category === "Infrastructure" || s.project.category === "Data").slice(0, 3).map((s) => s.project.slug) },
  ].filter((c) => c.slugs.length >= 2);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[20px] border border-border bg-surface px-6 py-14 sm:px-12 sm:py-20">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="eyebrow">Proof of progress</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">Crypto makes promises. We track what ships.</h1>
          <p className="mt-4 text-lg text-slate">Follow public milestones, inspect the evidence, and compare delivery history across crypto projects.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/projects">
              Explore Projects <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/shipping-feed" variant="secondary">
              See What Shipped
            </ButtonLink>
          </div>
          <ProjectSearch size="lg" className="mx-auto mt-8 max-w-xl" />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs text-slate">
            <span>{stats.projects} projects tracked</span>
            <span>{stats.milestones} commitments</span>
            <span>{stats.acceptedEvidence} verified evidence records</span>
            {config.demoMode ? <DemoBadge /> : null}
          </div>
        </div>
      </section>

      {/* Latest verified shipments */}
      <section aria-labelledby="shipped-heading">
        <SectionHeading
          id="shipped-heading"
          eyebrow="Verified from public evidence"
          title="Latest verified shipments"
          description="Milestones moved to shipped or partially shipped by a moderator, with the accepted source."
          action={
            <Link href="/shipping-feed" className="text-sm text-primary hover:underline">
              Full shipping feed →
            </Link>
          }
        />
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {shipped.map((event) => {
            const project = projects.get(event.projectId);
            const meta = FEED_TYPE_META[event.type];
            return (
              <li key={event.id} className="card flex flex-col gap-2 p-4">
                <span className={cn("stamp self-start", meta.tone)}>
                  <BadgeCheck className="h-3 w-3" aria-hidden="true" /> {meta.label}
                </span>
                <Link href={project && event.milestoneId ? `/projects/${project.slug}/milestones/${event.milestoneId}` : "/shipping-feed"} className="text-sm font-medium text-ink hover:text-primary">
                  {event.title}
                </Link>
                <p className="line-clamp-2 text-xs text-slate">{event.summary}</p>
                <div className="mt-auto flex flex-col gap-1">
                  <SourceChip url={event.sourceUrl} />
                  <span className="font-mono text-[11px] text-slate-dim">{formatDate(event.occurredAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Due this week + attention */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="due-heading">
          <SectionHeading
            id="due-heading"
            eyebrow="Commitments"
            title="Due this week"
            description="Public deadlines in the next seven days. Dates and status only — no countdowns."
            action={
              <Link href="/deadlines" className="text-sm text-primary hover:underline">
                Calendar →
              </Link>
            }
          />
          {dueThisWeek.length === 0 ? (
            <Card>
              <p className="text-sm text-slate">No public commitments are due in the next seven days.</p>
            </Card>
          ) : (
            <ol className="divide-y divide-border rounded-[14px] border border-border bg-surface">
              {dueThisWeek.map((m) => {
                const project = projects.get(m.projectId);
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <CalendarClock className="h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <Link href={project ? `/projects/${project.slug}/milestones/${m.id}` : "/deadlines"} className="font-medium text-ink hover:text-primary">
                        {m.title}
                      </Link>
                      <p className="font-mono text-xs text-slate">
                        {project?.name} · {formatDate(m.deadline)} · {formatRelative(m.deadline)}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="attention-heading">
          <SectionHeading
            id="attention-heading"
            eyebrow="Recently delayed or unevidenced"
            title="Items without qualifying evidence"
            description="Deadlines that passed without a verified delivery. A missed deadline is a fact about the record, not a conclusion about intent."
          />
          <ol className="space-y-3">
            {attention.map((event) => {
              const project = projects.get(event.projectId);
              const meta = FEED_TYPE_META[event.type];
              return (
                <li key={event.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("stamp", meta.tone)}>
                      <Clock3 className="h-3 w-3" aria-hidden="true" /> {meta.label}
                    </span>
                    <span className="font-mono text-xs text-slate">{formatDate(event.occurredAt)}</span>
                  </div>
                  <Link href={project && event.milestoneId ? `/projects/${project.slug}/milestones/${event.milestoneId}` : "/shipping-feed"} className="mt-2 block text-sm font-medium text-ink hover:text-primary">
                    {event.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate">{event.summary}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* Most consistent shippers */}
      <section aria-labelledby="consistent-heading">
        <SectionHeading
          id="consistent-heading"
          eyebrow="Documented delivery"
          title="Most consistent shippers"
          description="Highest Ship Scores among projects with sufficient data. This measures documented delivery, not investment quality."
          action={
            <Link href="/projects?sort=score" className="text-sm text-primary hover:underline">
              Full directory →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {consistent.map((s) => (
            <ProjectCard key={s.project.id} summary={s} />
          ))}
        </div>
      </section>

      {/* Ship Score explanation */}
      <section aria-labelledby="score-heading" className="card p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center">
            <ShipScoreGauge total={72} size={140} label="Example Ship Score" />
          </div>
          <div>
            <SectionHeading id="score-heading" eyebrow="How the Ship Score works" title="A transparent, versioned delivery score" />
            <p className="text-sm text-slate">
              Each project receives a 0–100 Ship Score only when minimum data exists; otherwise we show <em>Insufficient data</em>. The formula is public and every snapshot stores raw component values and the formula version.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-5">
              {(
                [
                  ["Milestone delivery", FORMULA_V1.weights.delivery],
                  ["Development continuity", FORMULA_V1.weights.development],
                  ["Product availability", FORMULA_V1.weights.availability],
                  ["Transparency", FORMULA_V1.weights.transparency],
                  ["Evidence quality", FORMULA_V1.weights.evidence],
                ] as const
              ).map(([label, weight]) => (
                <div key={label} className="rounded-lg border border-border bg-bg p-3">
                  <dt className="text-xs text-slate">{label}</dt>
                  <dd className="mt-1 font-mono text-lg text-ink">{Math.round(weight * 100)}%</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 font-mono text-xs text-slate">ship_score = delivery×0.40 + development×0.20 + availability×0.15 + transparency×0.15 + evidence×0.10</p>
            <Link href="/methodology" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Read the methodology <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trending comparisons + community activity */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="compare-heading">
          <SectionHeading id="compare-heading" eyebrow="Compare" title="Trending project comparisons" description="Side-by-side documented delivery. Comparison is about records, not investment quality." />
          <ul className="space-y-3">
            {trendingComparisons.map((c) => (
              <li key={c.label}>
                <Link href={`/compare?projects=${c.slugs.join(",")}`} className="card flex items-center justify-between gap-3 p-4 hover:border-border-strong">
                  <span className="flex items-center gap-3">
                    <GitCompareArrows className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium text-ink">{c.label}</span>
                      <span className="block text-xs text-slate">{c.slugs.map((slug) => summaries.find((s) => s.project.slug === slug)?.project.name).join(" · ")}</span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="community-heading">
          <SectionHeading
            id="community-heading"
            eyebrow="Community"
            title="Evidence activity"
            description={`${stats.pendingEvidence} submissions pending review · ${stats.openDisputes} open corrections · ${stats.contributors} contributors`}
            action={
              <Link href="/submit" className="text-sm text-primary hover:underline">
                Submit evidence →
              </Link>
            }
          />
          <ol className="divide-y divide-border rounded-[14px] border border-border bg-surface">
            {evidenceActivity.map((e) => {
              const project = projects.get(e.projectId);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  {e.reviewState === "accepted" ? <BadgeCheck className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" /> : e.reviewState === "pending" ? <Users className="h-4 w-4 shrink-0 text-amber" aria-hidden="true" /> : <Scale className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />}
                  <div className="min-w-0 flex-1">
                    <Link href={`/proof/${e.id}`} className="text-sm font-medium text-ink hover:text-primary">
                      {e.title}
                    </Link>
                    <p className="font-mono text-xs text-slate">
                      {project?.name} · {e.submitterName} · {e.reviewState === "accepted" ? "verified" : e.reviewState.replace("_", " ")}
                    </p>
                  </div>
                  <DataFreshness checkedAt={e.createdAt} label="" />
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <Disclaimer className="border-t border-border pt-6" />
    </div>
  );
}

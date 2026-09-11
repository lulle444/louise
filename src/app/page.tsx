import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, Clock3, GitCompareArrows, Scale, Users } from "lucide-react";
import { DataFreshness } from "@/components/DataFreshness";
import { BrandImage, hasBrandImage } from "@/components/BrandImage";
import { EventTicker } from "@/components/EventTicker";
import { FollowCta } from "@/components/FollowCta";
import { HeroScoreDemo } from "@/components/HeroScoreDemo";
import { HomeFaq } from "@/components/HomeFaq";
import { getConfig, SITE } from "@/lib/config";
import { Disclaimer } from "@/components/Disclaimer";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectSearch } from "@/components/ProjectSearch";
import { FEED_TYPE_META } from "@/components/ShippingFeed";
import { ShipScoreGauge } from "@/components/ShipScoreGauge";
import { SourceChip } from "@/components/SourceChip";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink, Card, SectionHeading, cn } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { FORMULA_V1 } from "@/lib/domain/score";
import { formatDate, formatRelative, isoDateOnly } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ds = await getDataSource();
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const [summaries, shipped, dueThisWeek, attention, evidenceActivity, stats, tickerEvents] = await Promise.all([
    ds.listProjectSummaries({ sort: "score" }),
    ds.listFeedEvents({ types: ["shipped", "partially_shipped"], limit: 5, verifiedOnly: true }),
    ds.listMilestones({ dueAfter: isoDateOnly(now), dueBefore: isoDateOnly(weekAhead) }),
    ds.listFeedEvents({ types: ["delayed", "no_evidence"], limit: 4, verifiedOnly: true }),
    ds.listEvidence({ limit: 6 }),
    ds.getStats(),
    ds.listFeedEvents({ limit: 14, verifiedOnly: true }),
  ]);
  const projects = new Map(summaries.map((s) => [s.project.id, s.project]));
  const appUrl = getConfig().appUrl;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "SHIPTRACE", url: appUrl, logo: `${appUrl}/icon.svg`, sameAs: [SITE.xUrl] },
      {
        "@type": "WebSite",
        name: "SHIPTRACE",
        url: appUrl,
        description: SITE.description,
        potentialAction: { "@type": "SearchAction", target: `${appUrl}/projects?q={search_term_string}`, "query-input": "required name=search_term_string" },
      },
    ],
  };
  const consistent = summaries.filter((s) => s.score?.total !== null && s.score !== null).slice(0, 4);
  const compareTrio = summaries.slice(0, 3).map((s) => s.project.slug);
  const trendingComparisons = [
    { label: "Top three by Ship Score", slugs: compareTrio },
    { label: "Layer 1 vs Layer 2", slugs: summaries.filter((s) => s.project.category === "L1" || s.project.category === "L2").slice(0, 3).map((s) => s.project.slug) },
    { label: "Infrastructure providers", slugs: summaries.filter((s) => s.project.category === "Infrastructure" || s.project.category === "Data").slice(0, 3).map((s) => s.project.slug) },
  ].filter((c) => c.slugs.length >= 2);

  return (
    <div className="space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EventTicker events={tickerEvents} projects={projects} />
      {/* Hero */}
      <section className="relative pb-6 pt-8 sm:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <p className="eyebrow">Proof of progress</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Crypto makes promises.
              <span className="block text-primary">We track what ships.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate lg:mx-0 sm:text-xl">Follow public milestones, inspect the evidence, and compare delivery history across crypto projects.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <ButtonLink href="/projects" className="px-6 py-3 text-base">
                Explore Projects <ArrowRight className="btn-arrow h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/shipping-feed" variant="secondary" className="px-6 py-3 text-base">
                See What Shipped
              </ButtonLink>
            </div>
            <p className="mt-3 font-mono text-xs text-slate">Free to browse · No wallet · No sign-up needed</p>
            <ProjectSearch size="lg" className="mx-auto mt-8 max-w-xl lg:mx-0" />
          </div>
          <div className="px-2 sm:px-6 lg:px-0">
            <HeroScoreDemo />
          </div>
        </div>
        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3">
          {[
            [stats.projects, "projects tracked"],
            [stats.milestones, "public commitments"],
            [stats.acceptedEvidence, "verified evidence records"],
          ].map(([value, label]) => (
            <div key={String(label)} className="card flex flex-col px-4 py-4 text-center">
              <dt className="order-2 text-xs uppercase tracking-wider text-slate">{label}</dt>
              <dd className="order-1 text-2xl font-bold tabular-nums text-ink sm:text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      {hasBrandImage("pipeline") ? (
        <section aria-labelledby="how-heading" className="card overflow-hidden p-0">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="p-6 sm:p-8">
              <SectionHeading id="how-heading" eyebrow="How it works" title="Every claim leaves a trace" />
              <ol className="space-y-3 text-sm text-slate">
                {[
                  ["Commitment", "A public roadmap item is recorded with its source and deadline."],
                  ["Code", "Repository releases and tags are observed, never assumed."],
                  ["Product", "Live endpoints are checked on a schedule."],
                  ["Deadline", "The date passes, or the project publishes an update."],
                  ["Verified", "A moderator records the conclusion with reasons and evidence."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-[11px] font-semibold text-primary">{i + 1}</span>
                    <span>
                      <span className="font-medium text-ink">{title}.</span> {body}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <BrandImage name="pipeline" className="rounded-none lg:rounded-l-none" sizes="(min-width: 1024px) 55vw, 100vw" />
          </div>
        </section>
      ) : null}

      {/* Latest verified shipments */}
      <section aria-labelledby="shipped-heading">
        <SectionHeading
          id="shipped-heading"
          eyebrow="Verified from public evidence"
          title="Latest verified shipments"
          description="Milestones moved to shipped or partially shipped by a moderator, with the accepted source."
          action={
            <Link href="/shipping-feed" className="arrow-link text-sm text-primary">
              Full shipping feed
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
              <Link href="/deadlines" className="arrow-link text-sm text-primary">
                Calendar
              </Link>
            }
          />
          <BrandImage name="calendar" className="mb-4" sizes="(min-width: 1024px) 40vw, 100vw" />
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
            <Link href="/projects?sort=score" className="arrow-link text-sm text-primary">
              Full directory
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
            {hasBrandImage("scoreRing") ? (
              <BrandImage name="scoreRing" className="w-full max-w-sm" sizes="(min-width: 1024px) 30vw, 100vw" />
            ) : (
              <ShipScoreGauge total={72} size={140} label="Example Ship Score" />
            )}
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
            <Link href="/methodology" className="arrow-link mt-4 text-sm text-primary">
              Read the methodology
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
              <Link href="/submit" className="arrow-link text-sm text-primary">
                Submit evidence
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

      <HomeFaq />

      <FollowCta />

      <Disclaimer className="border-t border-border pt-6" />
    </div>
  );
}

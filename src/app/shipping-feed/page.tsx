import type { Metadata } from "next";
import { BrandImage } from "@/components/BrandImage";
import { FEED_TYPE_META, ShippingFeed } from "@/components/ShippingFeed";
import { PageHeader, inputClass } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { FEED_EVENT_TYPES, type FeedEventType } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Shipping feed", description: "Chronological feed of verified crypto project events: shipped, partially shipped, delayed, new commitments, deadline changes, evidence and dispute resolutions." };
export const dynamic = "force-dynamic";

export default async function ShippingFeedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const typeParam = Array.isArray(params.type) ? params.type : params.type ? [params.type] : [];
  const types = typeParam.filter((t): t is FeedEventType => (FEED_EVENT_TYPES as readonly string[]).includes(t));
  const projectSlug = typeof params.project === "string" ? params.project : "";
  const ds = await getDataSource();
  const summaries = await ds.listProjectSummaries({ sort: "name" });
  const projects = new Map(summaries.map((s) => [s.project.id, s.project]));
  const project = projectSlug ? summaries.find((s) => s.project.slug === projectSlug)?.project : undefined;
  const events = await ds.listFeedEvents({ types, projectId: project?.id, verifiedOnly: true, limit: 120 });

  return (
    <div>
      <PageHeader eyebrow="This week in shipping" title="Shipping feed" description="Verified events in chronological order. Every entry links to its public source. Weekly digest: filter by type or project." />
      <BrandImage name="trace" className="mb-6" sizes="100vw" />
      <form method="get" action="/shipping-feed" className="card mb-6 p-4">
        <fieldset>
          <legend className="text-xs uppercase tracking-wider text-slate">Event types</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FEED_EVENT_TYPES.map((t) => (
              <label key={t} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-slate has-[:checked]:border-primary has-[:checked]:text-ink">
                <input type="checkbox" name="type" value={t} defaultChecked={types.includes(t)} className="accent-[#1f8bf0]" />
                {FEED_TYPE_META[t].label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate">
            Project
            <select name="project" defaultValue={projectSlug} className={`${inputClass} mt-1 w-64`}>
              <option value="">All projects</option>
              {summaries.map((s) => (
                <option key={s.project.id} value={s.project.slug}>
                  {s.project.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
          <a href="/shipping-feed" className="text-sm text-slate hover:text-ink">
            Reset
          </a>
        </div>
      </form>
      <p className="mb-4 font-mono text-xs text-slate" role="status">
        {events.length} events{types.length ? ` · ${types.length} type filter${types.length === 1 ? "" : "s"}` : ""}
        {project ? ` · ${project.name}` : ""}
      </p>
      <ShippingFeed events={events} projects={projects} />
    </div>
  );
}

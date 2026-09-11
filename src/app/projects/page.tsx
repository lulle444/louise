import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectSearch } from "@/components/ProjectSearch";
import { EmptyState, PageHeader, inputClass } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { SORT_LABELS } from "@/lib/data/summaries";
import type { ProjectFilters, SortKey } from "@/lib/data/types";
import { SCORE_BAND_LABELS, type ScoreBand } from "@/lib/domain/score";
import { STATUS_LABELS } from "@/lib/domain/status";
import { MILESTONE_STATUSES, PROJECT_CATEGORIES, type MilestoneStatus, type ProjectCategory } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Projects", description: "Searchable directory of tracked crypto projects with transparent Ship Scores and milestone delivery records." };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | "" {
  const v = Array.isArray(value) ? value[0] : value;
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : "";
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const ds = await getDataSource();
  const all = await ds.listProjectSummaries();
  const ecosystems = Array.from(new Set(all.map((s) => s.project.ecosystem))).sort();
  const filters: ProjectFilters = {
    q: typeof params.q === "string" ? params.q.slice(0, 100) : "",
    category: pick<ProjectCategory>(params.category, PROJECT_CATEGORIES),
    ecosystem: typeof params.ecosystem === "string" && ecosystems.includes(params.ecosystem) ? params.ecosystem : "",
    milestoneStatus: pick<MilestoneStatus>(params.status, MILESTONE_STATUSES),
    band: pick<ScoreBand>(params.band, ["high", "solid", "mixed", "low", "insufficient"]),
    evidenceRecency: pick(params.evidence, ["7d", "30d", "90d"] as const),
    activity: pick(params.activity, ["active", "quiet", "none"] as const),
    sort: pick<SortKey>(params.sort, ["score", "name", "next_deadline", "last_evidence", "delivered"]) || "score",
  };
  const results = await ds.listProjectSummaries(filters);
  const activeFilters = Object.entries(filters).filter(([k, v]) => v && k !== "sort").length;

  return (
    <div>
      <PageHeader eyebrow="Directory" title="Projects" description="Search and filter tracked projects. Sorting is explicit and shown below; no project can pay for placement." />
      <form method="get" action="/projects" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filter projects">
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Search projects, products, or commitments" className={inputClass} />
        </div>
        <label className="text-xs text-slate">
          Category
          <select name="category" defaultValue={filters.category} className={`${inputClass} mt-1`}>
            <option value="">All</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate">
          Ecosystem
          <select name="ecosystem" defaultValue={filters.ecosystem} className={`${inputClass} mt-1`}>
            <option value="">All</option>
            {ecosystems.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate">
          Has milestone with status
          <select name="status" defaultValue={filters.milestoneStatus} className={`${inputClass} mt-1`}>
            <option value="">Any</option>
            {MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate">
          Ship Score band
          <select name="band" defaultValue={filters.band} className={`${inputClass} mt-1`}>
            <option value="">Any</option>
            {(Object.keys(SCORE_BAND_LABELS) as ScoreBand[]).map((b) => (
              <option key={b} value={b}>
                {SCORE_BAND_LABELS[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate">
          Evidence recency
          <select name="evidence" defaultValue={filters.evidenceRecency} className={`${inputClass} mt-1`}>
            <option value="">Any</option>
            <option value="7d">Accepted in last 7 days</option>
            <option value="30d">Accepted in last 30 days</option>
            <option value="90d">Accepted in last 90 days</option>
          </select>
        </label>
        <label className="text-xs text-slate">
          Development activity
          <select name="activity" defaultValue={filters.activity} className={`${inputClass} mt-1`}>
            <option value="">Any</option>
            <option value="active">Push within 30 days</option>
            <option value="quiet">No push for 30+ days</option>
            <option value="none">No public repository</option>
          </select>
        </label>
        <label className="text-xs text-slate">
          Sort by
          <select name="sort" defaultValue={filters.sort} className={`${inputClass} mt-1`}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-bg hover:bg-[#7aa1ff]">
            Apply
          </button>
          <Link href="/projects" className="rounded-lg border border-border px-4 py-2 text-sm text-slate hover:text-ink">
            Reset
          </Link>
        </div>
      </form>
      <p className="mb-4 font-mono text-xs text-slate" role="status">
        {results.length} of {all.length} projects · sorted by {SORT_LABELS[filters.sort ?? "score"]}
        {activeFilters ? ` · ${activeFilters} filter${activeFilters === 1 ? "" : "s"} active` : ""}
      </p>
      {results.length === 0 ? (
        <EmptyState title="No projects match" description="Try removing a filter or searching for a different term." action={<ProjectSearch className="w-full max-w-md" />} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((s) => (
            <li key={s.project.id}>
              <ProjectCard summary={s} compareHref={`/compare?projects=${s.project.slug}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

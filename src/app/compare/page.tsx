import type { Metadata } from "next";
import Link from "next/link";
import { CompareTable } from "@/components/CompareTable";
import { Alert, EmptyState, PageHeader, inputClass } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import type { ProjectBundle } from "@/lib/data/types";

export const metadata: Metadata = { title: "Compare projects", description: "Compare up to three crypto projects on documented delivery: Ship Score, delivery rate, on-time rate, evidence quality, and more." };
export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ projects?: string | string[] }> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.projects) ? params.projects.join(",") : (params.projects ?? "");
  const slugs = Array.from(new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))).slice(0, 3);
  const ds = await getDataSource();
  const all = await ds.listProjectSummaries({ sort: "name" });
  const bundles = (await Promise.all(slugs.map((slug) => ds.getProjectBundle(slug)))).filter((b): b is ProjectBundle => !!b && b.project.status === "published");
  const selected = [bundles[0]?.project.slug ?? "", bundles[1]?.project.slug ?? "", bundles[2]?.project.slug ?? ""];

  return (
    <div>
      <PageHeader eyebrow="Compare" title="Compare documented delivery" description="Choose up to three projects. This comparison is about documented delivery history — commitments, deadlines, and evidence — not investment quality." />
      <form method="get" action="/compare" className="card mb-6 grid gap-3 p-4 sm:grid-cols-3" aria-label="Choose projects to compare">
        {selected.map((value, i) => (
          <label key={i} className="text-xs text-slate">
            Project {i + 1}
            <select name="projects" defaultValue={value} className={`${inputClass} mt-1`}>
              <option value="">{i === 0 ? "Choose a project" : "None"}</option>
              {all.map((s) => (
                <option key={s.project.id} value={s.project.slug}>
                  {s.project.name} ({s.project.category})
                </option>
              ))}
            </select>
          </label>
        ))}
        <div className="sm:col-span-3">
          <button type="submit" className="btn btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white">
            Compare
          </button>
        </div>
      </form>
      {bundles.length === 0 ? (
        <EmptyState
          title="Pick projects to compare"
          description="Select up to three projects above, or open a comparison from a project card."
          action={
            <Link href={`/compare?projects=${all.slice(0, 3).map((s) => s.project.slug).join(",")}`} className="text-sm text-primary underline underline-offset-4">
              Try an example comparison
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="card p-2 sm:p-4">
            <CompareTable bundles={bundles} />
          </div>
          <Alert tone="neutral">
            Metrics are computed from stored snapshots and approved milestones. Missing components are excluded, not assumed. Disputed milestones are excluded from every rate. Read the{" "}
            <Link href="/methodology" className="text-primary underline underline-offset-4">
              methodology
            </Link>
            .
          </Alert>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import type { ProjectBundle } from "@/lib/data/types";
import { deliveryRates } from "@/lib/domain/score";
import { formatDate, formatRelative } from "@/lib/format";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ShipScoreGauge } from "./ShipScoreGauge";
import { StatusBadge } from "./StatusBadge";

function Num({ value, suffix = "" }: { value: number | null | undefined; suffix?: string }) {
  return value === null || value === undefined ? <span className="text-slate">no data</span> : <span className="font-mono tabular-nums text-ink">{value}{suffix}</span>;
}

/** Semantic comparison table (up to three projects) on documented delivery metrics. */
export function CompareTable({ bundles }: { bundles: ProjectBundle[] }) {
  const now = new Date();
  const rows = bundles.map((b) => {
    const rates = deliveryRates(b.milestones, now);
    const next = b.milestones
      .filter((m) => m.deadline >= now.toISOString().slice(0, 10) && m.status !== "shipped" && m.status !== "cancelled")
      .sort((a, c) => a.deadline.localeCompare(c.deadline))[0];
    return { b, rates, next };
  });
  return (
    <div className="overflow-x-auto">
      <table className="data w-full min-w-[640px] text-sm">
        <caption className="sr-only">Comparison of documented delivery metrics across selected projects</caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            {rows.map(({ b }) => (
              <th key={b.project.id} scope="col">
                <Link href={`/projects/${b.project.slug}`} className="text-ink hover:text-primary normal-case tracking-normal text-sm">
                  {b.project.name}
                </Link>
                <span className="block text-[11px] font-normal normal-case tracking-normal text-slate">
                  {b.project.category} · {b.project.ecosystem}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Ship Score</th>
            {rows.map(({ b }) => (
              <td key={b.project.id}>
                <ShipScoreGauge total={b.latestScore?.total ?? null} size={64} />
                <span className="mt-1 block font-mono text-[11px] text-slate">formula {b.latestScore?.formulaVersion ?? "—"}</span>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Data completeness / confidence</th>
            {rows.map(({ b }) => (
              <td key={b.project.id}>{b.latestScore ? <ConfidenceBadge confidence={b.latestScore.confidence} dataCompleteness={b.latestScore.dataCompleteness} /> : <span className="text-slate">no snapshot</span>}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Milestone delivery rate</th>
            {rows.map(({ b, rates }) => (
              <td key={b.project.id}>
                <Num value={rates.deliveryRate} suffix="%" /> <span className="text-xs text-slate">({rates.delivered}/{rates.due} due)</span>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">On-time rate</th>
            {rows.map(({ b, rates }) => (
              <td key={b.project.id}>
                <Num value={rates.onTimeRate} suffix="%" />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Evidence quality</th>
            {rows.map(({ b }) => (
              <td key={b.project.id}>
                <Num value={b.latestScore?.components.evidence} />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Development continuity</th>
            {rows.map(({ b }) => (
              <td key={b.project.id}>
                <Num value={b.latestScore?.components.development} />
                {b.githubRepositories.length === 0 ? <span className="block text-xs text-slate">no public repository listed</span> : null}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Product availability</th>
            {rows.map(({ b }) => (
              <td key={b.project.id}>
                <Num value={b.latestScore?.components.availability} />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Transparency</th>
            {rows.map(({ b }) => (
              <td key={b.project.id}>
                <Num value={b.latestScore?.components.transparency} />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Next deadline</th>
            {rows.map(({ b, next }) => (
              <td key={b.project.id}>
                {next ? (
                  <div className="space-y-1">
                    <Link href={`/projects/${b.project.slug}/milestones/${next.id}`} className="text-ink hover:text-primary">
                      {next.title}
                    </Link>
                    <p className="font-mono text-xs text-slate">
                      {formatDate(next.deadline)} · {formatRelative(next.deadline)}
                    </p>
                    <StatusBadge status={next.status} />
                  </div>
                ) : (
                  <span className="text-slate">none listed</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Disputed items (excluded)</th>
            {rows.map(({ b }) => (
              <td key={b.project.id}>
                <Num value={b.milestones.filter((m) => m.status === "disputed").length} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

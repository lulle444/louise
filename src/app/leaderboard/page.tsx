import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { getViewer } from "@/lib/auth/session";
import { MIN_RANKED_BATTLES } from "@/lib/config";
import { buildLeaderboard, loadArenaContext, type LeaderboardRange } from "@/lib/services/stats";
import { LeaderboardTable } from "@/components/profile/LeaderboardTable";
import { PageHeader } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/States";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard", description: "Callscore ratings for ranked analysts by accuracy, experience and consistency." };

const RANGES: Array<{ key: LeaderboardRange; label: string }> = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];
const ASSETS = ["BTC", "ETH", "SOL"];

export default async function LeaderboardPage(props: PageProps<"/leaderboard">) {
  const sp = await props.searchParams;
  const range: LeaderboardRange = RANGES.some((r) => r.key === sp.range) ? (sp.range as LeaderboardRange) : "all";
  const asset = typeof sp.asset === "string" && ASSETS.includes(sp.asset.toUpperCase()) ? sp.asset.toUpperCase() : null;
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const ctx = await loadArenaContext(repo);
  const rows = buildLeaderboard(ctx, { range, asset });
  const ranked = rows.filter((r) => r.ranked);
  const unranked = rows.filter((r) => !r.ranked);
  const href = (r: LeaderboardRange, a: string | null) => `/leaderboard?range=${r}${a ? `&asset=${a}` : ""}`;
  return (
    <>
      <PageHeader eyebrow="Leaderboard" title="Callscore ratings" description={<>Only analysts with at least {MIN_RANKED_BATTLES} valid settled Rounds in the selected scope are ranked. Rating = accuracy × 0.6 + experience (up to 25) + consistency (up to 15). <Link href="/methodology#leaderboard" className="text-cyan hover:underline">Formula →</Link></>} />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <Link key={r.key} href={href(r.key, asset)} aria-current={range === r.key ? "true" : undefined} className={`rounded-md px-3 py-1.5 text-sm ${range === r.key ? "bg-surface-3 text-text" : "text-muted hover:text-text"}`}>{r.label}</Link>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1" role="group" aria-label="Asset">
            <Link href={href(range, null)} aria-current={asset === null ? "true" : undefined} className={`rounded-md px-3 py-1.5 text-sm ${asset === null ? "bg-surface-3 text-text" : "text-muted hover:text-text"}`}>All assets</Link>
            {ASSETS.map((a) => (
              <Link key={a} href={href(range, a)} aria-current={asset === a ? "true" : undefined} className={`num rounded-md px-3 py-1.5 text-sm ${asset === a ? "bg-surface-3 text-text" : "text-muted hover:text-text"}`}>{a}</Link>
            ))}
          </div>
        </div>
        <div className="mt-6">
          {rows.length === 0 ? (
            <EmptyState title="No settled forecasts in this scope" description="Try a wider time range or another asset." />
          ) : (
            <LeaderboardTable rows={rows} highlightUserId={viewer?.id ?? null} />
          )}
          <p className="mt-3 text-xs text-muted">
            {ranked.length} ranked · {unranked.length} provisional (fewer than {MIN_RANKED_BATTLES} settled Rounds in scope; shown unranked with a provisional rating). Track records are forecasting-game history, not investment performance.
          </p>
        </div>
      </div>
    </>
  );
}

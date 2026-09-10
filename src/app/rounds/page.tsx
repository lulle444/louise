import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { maybeRunMaintenance } from "@/lib/services/maintenance";
import { getViewer } from "@/lib/auth/session";
import { listBattleSummaries } from "@/lib/services/battle-view";
import { BattleCard } from "@/components/arena/BattleCard";
import { PageHeader } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/States";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Callscore", description: "Live, upcoming and settled Rounds." };

const TABS = [
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "settled", label: "Settled" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function ArenaPage(props: PageProps<"/rounds">) {
  await maybeRunMaintenance();
  const sp = await props.searchParams;
  const raw = typeof sp.tab === "string" ? sp.tab : "live";
  const tab: Tab = TABS.some((t) => t.key === raw) ? (raw as Tab) : "live";
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const summaries = await listBattleSummaries(repo, viewer);
  const groups: Record<Tab, typeof summaries> = {
    live: summaries.filter((s) => s.status === "open" || s.status === "locked" || s.status === "settling").sort((a, b) => Date.parse(a.battle.endsAt) - Date.parse(b.battle.endsAt)),
    upcoming: summaries.filter((s) => s.status === "upcoming").sort((a, b) => Date.parse(a.battle.opensAt) - Date.parse(b.battle.opensAt)),
    settled: summaries.filter((s) => s.status === "settled" || s.status === "void"),
  };
  const list = groups[tab];
  return (
    <>
      <PageHeader eyebrow="Callscore" title="Rounds" description="Daily forecasting challenges on BTC, ETH and SOL. Lock before the deadline; results settle automatically from the end-price snapshot." />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1" role="tablist" aria-label="Round status">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/rounds?tab=${t.key}`}
              role="tab"
              aria-selected={tab === t.key}
              className={`flex-1 rounded-md px-3 py-2 text-center text-sm transition ${tab === t.key ? "bg-surface-3 text-text" : "text-muted hover:text-text"}`}
            >
              {t.label} <span className="num ml-1 text-xs text-muted">{groups[t.key].length}</span>
            </Link>
          ))}
        </div>
        <div className="mt-6" role="tabpanel">
          {list.length === 0 ? (
            <EmptyState
              title={tab === "live" ? "No live Round right now" : tab === "upcoming" ? "No upcoming Rounds scheduled" : "No settled Rounds yet"}
              description={tab === "live" ? "Check the upcoming tab for the next scheduled Round." : tab === "upcoming" ? "New Daily Rounds are published by Callscore team." : "Results will appear here after the first Round settles."}
              action={tab !== "live" && groups.live.length ? { href: "/rounds?tab=live", label: "See live Rounds" } : undefined}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((s) => <BattleCard key={s.battle.id} summary={s} />)}</div>
          )}
        </div>
      </div>
    </>
  );
}

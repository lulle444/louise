import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Users } from "lucide-react";
import { AICoachCard } from "@/components/AICoachCard";
import { Avatar } from "@/components/Avatar";
import { DemoBadge } from "@/components/DemoBadge";
import { EmptyState } from "@/components/EmptyState";
import { ScoreHistoryChart } from "@/components/ScoreHistoryChart";
import { SectionHeading } from "@/components/SectionHeading";
import { getSession } from "@/lib/auth/session";
import { getAiVsCrowd } from "@/lib/services/views";
import { AI_PROFILES } from "@/lib/scoring/ai";

export const metadata: Metadata = { title: "AI vs Crowd" };

const WINDOWS = [7, 30, 90] as const;

export default async function AiVsCrowdPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const sp = await searchParams;
  const windowDays = WINDOWS.includes(Number(sp.window) as (typeof WINDOWS)[number]) ? Number(sp.window) : 90;
  const session = await getSession();
  const { rows, races, series } = await getAiVsCrowd(session, windowDays);
  const narratives = await session.store.listNarratives();
  const narrativeById = new Map(narratives.map((n) => [n.id, n]));
  const chart = series.map((s) => ({ label: s.race.name.replace("Narrative Race", "R"), ROTATOR: s.ai.ROTATOR ?? 0, ATLAS: s.ai.ATLAS ?? 0, NOVA: s.ai.NOVA ?? 0, Crowd: s.crowd, Humans: Math.round(s.humans) }));

  return (
    <div className="space-y-8 py-8">
      <SectionHeading
        eyebrow="Comparison"
        title="AI vs Crowd"
        description="Three fictional, rule-based coaches versus the crowd consensus lineup and the top human players. All entrants obey the same deadline and 100-Energy rule."
        action={session.demo ? <DemoBadge /> : null}
      />
      <div className="flex gap-2" role="tablist" aria-label="Window">
        {WINDOWS.map((w) => (
          <Link key={w} href={`/ai-vs-crowd?window=${w}`} role="tab" aria-selected={w === windowDays} className={`btn btn-sm ${w === windowDays ? "btn-primary" : "btn-secondary"}`}>
            {w}-day
          </Link>
        ))}
        <span className="ml-auto self-center text-xs text-muted">{races.length} settled Race{races.length === 1 ? "" : "s"} in window</span>
      </div>

      {!races.length ? (
        <EmptyState title="No settled Races in this window" description="Try a longer window." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table" data-testid="ai-vs-crowd-table">
              <thead>
                <tr>
                  <th scope="col">Entrant</th>
                  <th scope="col">Type</th>
                  <th scope="col">Races</th>
                  <th scope="col">Avg score</th>
                  <th scope="col">Leaders called</th>
                  <th scope="col">Beat best AI</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      {r.href ? (
                        <Link href={r.href} className="flex items-center gap-2 hover:underline">
                          <Avatar seed={r.key} name={r.label} size={24} />
                          {r.label}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2 font-mono font-bold tracking-widest" style={{ color: r.accent }}>
                          {r.kind === "ai" ? <Bot className="h-4 w-4" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}
                          {r.label}
                        </span>
                      )}
                    </td>
                    <td className="text-xs uppercase tracking-wider text-muted">{r.kind}</td>
                    <td className="mono">{r.races}</td>
                    <td className="mono font-semibold">{r.averageScore.toFixed(1)}</td>
                    <td className="mono">{Math.round(r.leaderAccuracy * 100)}%</td>
                    <td className="mono">{r.kind === "ai" ? "—" : `${r.wins}/${r.races}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">Race-by-race scores</h2>
            <ScoreHistoryChart
              data={chart}
              yDomain={[0, 360]}
              yLabel="Race score"
              series={[
                { key: "Crowd", label: "Crowd consensus", color: "#B6F36B" },
                { key: "Humans", label: "Human average", color: "#E2E8F0" },
                { key: "ROTATOR", label: "ROTATOR", color: "#22D3EE" },
                { key: "ATLAS", label: "ATLAS", color: "#8B5CF6" },
                { key: "NOVA", label: "NOVA", color: "#FB7185" },
              ]}
            />
          </div>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">The coaches</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {AI_PROFILES.map((p) => (
            <AICoachCard key={p.id} profile={p} lineup={null} narrativeById={narrativeById} locked />
          ))}
        </div>
        <p className="text-xs text-dim">AI coaches are deterministic rules, not machine learning. Their strategy version and input snapshot are stored with every lineup.</p>
      </section>
    </div>
  );
}

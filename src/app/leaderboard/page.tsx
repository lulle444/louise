import type { Metadata } from "next";
import Link from "next/link";
import { DemoBadge } from "@/components/DemoBadge";
import { Leaderboard } from "@/components/Leaderboard";
import { MethodologyTooltip } from "@/components/MethodologyTooltip";
import { SectionHeading } from "@/components/SectionHeading";
import { getSession } from "@/lib/auth/session";
import { getLeaderboard } from "@/lib/services/views";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ window?: string; race?: string; specialty?: string }> }) {
  const sp = await searchParams;
  const window = sp.window === "race" || sp.window === "month" ? sp.window : "all";
  const session = await getSession();
  const narratives = await session.store.listNarratives();
  const allRaces = (await session.store.listRaces()).filter((r) => r.status === "settled");
  const raceId = sp.race && allRaces.some((r) => r.id === sp.race) ? sp.race : allRaces[0]?.id;
  const { rows } = await getLeaderboard(session, { window, raceId, specialty: sp.specialty || undefined });
  const q = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { window, race: sp.race, specialty: sp.specialty, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/leaderboard?${params.toString()}`;
  };

  return (
    <div className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Standings"
        title="Leaderboard"
        description="Official ranking requires three settled Races; newer players are shown as provisional."
        action={session.demo ? <DemoBadge /> : null}
      />
      <div className="flex flex-wrap items-center gap-2">
        {(["race", "month", "all"] as const).map((w) => (
          <Link key={w} href={q({ window: w })} className={`btn btn-sm ${window === w ? "btn-primary" : "btn-secondary"}`} aria-current={window === w ? "page" : undefined}>
            {w === "race" ? "Current Race" : w === "month" ? "This month" : "All time"}
          </Link>
        ))}
        {window === "race" ? (
          <form className="ml-2">
            <input type="hidden" name="window" value="race" />
            {sp.specialty ? <input type="hidden" name="specialty" value={sp.specialty} /> : null}
            <label htmlFor="race" className="sr-only">Race</label>
            <select id="race" name="race" defaultValue={raceId} className="input py-1 text-sm" onChange={undefined}>
              {allRaces.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-ghost btn-sm ml-1">Go</button>
          </form>
        ) : null}
        <form className="ml-auto flex items-center gap-1">
          <input type="hidden" name="window" value={window} />
          {sp.race ? <input type="hidden" name="race" value={sp.race} /> : null}
          <label htmlFor="specialty" className="text-xs text-muted">Specialty</label>
          <select id="specialty" name="specialty" defaultValue={sp.specialty ?? ""} className="input py-1 text-sm">
            <option value="">Any narrative</option>
            {narratives.map((n) => (
              <option key={n.id} value={n.slug}>{n.name}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost btn-sm">Filter</button>
        </form>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        Meta Rating <MethodologyTooltip label="Meta Rating" anchor="meta-rating">avg score × 4 + leader accuracy × 300 + challenger accuracy × 150 + wildcard accuracy × 150.</MethodologyTooltip>
      </div>
      <Leaderboard rows={rows} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { RaceCard } from "@/components/RaceCard";
import { ShareOnX } from "@/components/ShareOnX";
import { getSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/config";

export async function generateMetadata({ params }: { params: Promise<{ lineupId: string }> }): Promise<Metadata> {
  const { lineupId } = await params;
  return { title: `Race Card ${lineupId.slice(-6)}` };
}

export default async function LineupPage({ params }: { params: Promise<{ lineupId: string }> }) {
  const { lineupId } = await params;
  const { store, viewer } = await getSession();
  const lineup = await store.getLineup(lineupId);
  if (!lineup) notFound();
  const race = await store.getRace(lineup.raceId);
  if (!race) notFound();
  // Human lineups in an open Race are visible only to their owner (no crowd leakage before lock).
  if (race.status === "published" && lineup.userId !== viewer?.id && !viewer?.isAdmin) notFound();
  const [narratives, results, profile, aiProfiles] = await Promise.all([
    store.listNarratives(),
    store.listResults(race.id),
    lineup.userId ? store.getProfile(lineup.userId) : null,
    store.listAiProfiles(),
  ]);
  const narrativeById = new Map(narratives.map((n) => [n.id, n]));
  const result = results.find((r) => r.lineupId === lineup.id) ?? null;
  const ai = lineup.aiProfileId ? aiProfiles.find((p) => p.id === lineup.aiProfileId) : null;
  const url = `${getAppUrl()}/lineup/${lineup.id}`;
  const who = profile ? profile.displayName : ai?.name ?? "AI";
  const text = result
    ? `${who} scored ${result.raceScore.toFixed(0)} in ${race.name} on MEGASPRINT — the crypto narrative forecasting game (virtual points only).`
    : `${who} locked a lineup for ${race.name} on MEGASPRINT — the crypto narrative forecasting game (virtual points only).`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href={`/race/${race.id}`} className="hover:text-ink">{race.name}</Link> / <span className="text-ink">Race Card</span>
      </nav>
      <RaceCard lineup={lineup} race={race} profile={profile} result={result} narrativeById={narrativeById} aiName={ai?.name} />
      <div className="flex flex-wrap gap-2">
        <ShareOnX text={text} url={url} />
        <CopyLink url={url} />
        <Link href={`/race/${race.id}`} className="btn btn-ghost">Open Race</Link>
      </div>
      {lineup.isGuest ? <p className="text-xs text-dim">Guest lineups are stored in this browser only, so this link works for you but not for other people. Sign in with an account to publish shareable cards.</p> : null}
    </div>
  );
}

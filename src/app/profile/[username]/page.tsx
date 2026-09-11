import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, FileCheck2, Scale, ShieldCheck } from "lucide-react";
import { EvidenceCard } from "@/components/EvidenceCard";
import { EmptyState, PageHeader, Pill, SectionHeading, Stat } from "@/components/ui";
import { getDataSource } from "@/lib/data";
import { canAccessWatchlist } from "@/lib/domain/auth";
import { formatDate } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}`, description: `Contributor profile for ${username} on SHIPTRACE.` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const ds = await getDataSource();
  const [profile, viewer] = await Promise.all([ds.getProfileByUsername(username), getSessionUser()]);
  if (!profile) notFound();
  const [badges, evidence, disputes, list, summaries] = await Promise.all([
    ds.listUserBadges(profile.id),
    ds.listEvidence({ submitterId: profile.id }),
    ds.listDisputes({ submitterId: profile.id }),
    ds.getWatchlistForUser(profile.id),
    ds.listProjectSummaries({ sort: "name" }),
  ]);
  const projects = new Map(summaries.map((s) => [s.project.id, s.project]));
  const showWatchlist = list ? canAccessWatchlist(viewer, list.watchlist, "read") : false;
  const accepted = evidence.filter((e) => e.reviewState === "accepted");

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Contributor" title={profile.displayName}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-slate">@{profile.username}</span>
          <Pill tone={profile.role === "moderator" || profile.role === "admin" ? "mint" : "neutral"}>
            {profile.role === "moderator" || profile.role === "admin" ? <ShieldCheck className="h-3 w-3" aria-hidden="true" /> : null}
            {profile.role}
          </Pill>
          <span className="text-xs text-slate">member since {formatDate(profile.createdAt)}</span>
        </div>
        {profile.bio ? <p className="mt-3 max-w-2xl text-sm text-slate">{profile.bio}</p> : null}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Accepted evidence" value={profile.acceptedEvidenceCount} hint="Submissions verified by a moderator" />
        <Stat label="Helpful corrections" value={profile.helpfulCorrectionsCount} hint="Corrections that led to a status update" />
        <Stat label="Badges" value={badges.length} hint="Earned through accepted contributions, never token holdings" />
      </div>

      <section aria-labelledby="badges-h">
        <SectionHeading id="badges-h" eyebrow="Recognition" title="Badges" />
        {badges.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((b) => (
              <li key={b.id} className="card p-4">
                <Award className="h-5 w-5 text-amber" aria-hidden="true" />
                <p className="mt-2 font-medium text-ink">{b.name}</p>
                <p className="mt-1 text-xs text-slate">{b.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No badges yet" />
        )}
      </section>

      <section aria-labelledby="activity-h">
        <SectionHeading id="activity-h" eyebrow="Activity" title={`Evidence submissions (${evidence.length})`} description={`${accepted.length} accepted · ${evidence.length - accepted.length} pending, rejected or awaiting clarification`} />
        {evidence.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {evidence.slice(0, 8).map((e) => (
              <EvidenceCard key={e.id} evidence={e} />
            ))}
          </div>
        ) : (
          <EmptyState title="No submissions yet" />
        )}
      </section>

      {disputes.length ? (
        <section aria-labelledby="corrections-h">
          <SectionHeading id="corrections-h" eyebrow="Corrections" title={`Corrections filed (${disputes.length})`} />
          <ul className="divide-y divide-border rounded-[14px] border border-border bg-surface">
            {disputes.map((d) => {
              const p = projects.get(d.projectId);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <Scale className="h-4 w-4 text-violet" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-ink">
                    {p ? (
                      <Link href={d.milestoneId ? `/projects/${p.slug}/milestones/${d.milestoneId}` : `/projects/${p.slug}`} className="hover:text-primary">
                        {p.name}
                      </Link>
                    ) : null}
                    {" · "}
                    <span className="text-slate">{d.claim.slice(0, 120)}{d.claim.length > 120 ? "…" : ""}</span>
                  </span>
                  <Pill tone={d.state === "resolved" ? "mint" : d.state === "rejected" ? "coral" : "violet"}>{d.state.replace("_", " ")}</Pill>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="watch-h">
        <SectionHeading id="watch-h" eyebrow="Following" title="Watchlist" description={profile.watchlistPublic ? "Public" : "Private"} />
        {showWatchlist && list ? (
          list.items.length ? (
            <ul className="flex flex-wrap gap-2">
              {list.items.map((i) => {
                const p = projects.get(i.projectId);
                return p ? (
                  <li key={i.id}>
                    <Link href={`/projects/${p.slug}`} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:border-border-strong">
                      <FileCheck2 className="h-3.5 w-3.5 text-slate" aria-hidden="true" /> {p.name}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          ) : (
            <EmptyState title="Not following any projects" />
          )
        ) : (
          <p className="text-sm text-slate">This contributor keeps their watchlist private.</p>
        )}
      </section>
    </div>
  );
}

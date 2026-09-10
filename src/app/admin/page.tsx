import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { DemoBadge } from "@/components/DemoBadge";
import { ErrorState } from "@/components/ErrorState";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusPill } from "@/components/StatusPill";
import { getSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { groupSnapshots } from "@/lib/services/snapshots";
import { createRaceAction, raceTransitionAction, updateConstituentsAction, updateNarrativeAction } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

function toLocalInput(iso: string) {
  return iso.slice(0, 16);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; race?: string; narrative?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  const { viewer, store, demo } = session;

  // Server-side protection: non-admins get a 403-style page, never the panel.
  if (!viewer || !viewer.isAdmin) {
    return (
      <div className="py-16" data-testid="admin-denied">
        <ErrorState
          title="403 · Admin access required"
          description={viewer ? "Your account is not an administrator. Admins are configured with ADMIN_EMAILS." : demo ? "Sign in as the demo admin to open the control panel." : "Sign in with an admin account."}
          action={
            <Link href="/login?next=/admin" className="btn btn-primary">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Go to sign in
            </Link>
          }
        />
      </div>
    );
  }

  const [races, narratives, audit] = await Promise.all([store.listRaces({ includeDrafts: true }), store.listNarratives(), store.listAuditLog(40)]);
  const selectedRace = races.find((r) => r.id === sp.race) ?? races.find((r) => r.status === "live") ?? races[0] ?? null;
  const snapshots = selectedRace ? groupSnapshots(await store.listSnapshots(selectedRace.id)) : [];
  const unavailable = snapshots.flatMap((g) => g.rows.filter((r) => r.quality === "unavailable").map((r) => ({ ...r, takenAt: g.takenAt })));
  const selectedNarrative = narratives.find((n) => n.id === sp.narrative) ?? narratives[0] ?? null;
  const version = selectedNarrative ? await store.getConstituentVersion(selectedNarrative.currentConstituentVersionId) : null;
  const now = new Date();
  const plus = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();

  return (
    <div className="space-y-10 py-8" data-testid="admin-panel">
      <SectionHeading eyebrow="Control room" title="Admin" description={`Signed in as ${viewer.displayName}. Every action is written to the audit log.`} action={demo ? <DemoBadge label="Demo · in-memory" /> : null} />
      {demo ? <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">Demo Mode keeps state in server memory. Changes persist until the process restarts (or the next UTC day rebuilds the demo timeline).</p> : null}
      {sp.ok ? <p role="status" className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{sp.ok}</p> : null}
      {sp.error ? <p role="alert" className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{sp.error}</p> : null}

      {/* RACES */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Races</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col">Locks</th>
                <th scope="col">Window</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {races.map((r) => (
                <tr key={r.id} className={selectedRace?.id === r.id ? "bg-surface-2/60" : ""}>
                  <td className="mono">{r.number}</td>
                  <td>
                    <Link href={`/admin?race=${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                    {r.featured ? <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase text-primary">featured</span> : null}
                    <span className="block text-xs text-dim"><Link href={`/race/${r.id}`} className="hover:underline">public page</Link></span>
                  </td>
                  <td><StatusPill status={r.status} /></td>
                  <td className="mono text-xs">{formatDateTime(r.locksAt)}</td>
                  <td className="mono text-xs">{formatDateTime(r.startsAt)} → {formatDateTime(r.endsAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          ["publish", "Publish", r.status === "draft"],
                          ["lock-ai", "Lock AI", r.status === "published"],
                          ["lock", "Go live", r.status === "published"],
                          ["snapshot", "Snapshot", r.status === "live"],
                          ["settle", "Settle", r.status === "live"],
                          ["archive", "Archive", r.status === "settled" || r.status === "void"],
                          ["feature", r.featured ? "Unfeature" : "Feature", true],
                        ] as [string, string, boolean][]
                      )
                        .filter(([, , show]) => show)
                        .map(([action, label]) => (
                          <form key={action} action={raceTransitionAction}>
                            <input type="hidden" name="raceId" value={r.id} />
                            <input type="hidden" name="action" value={action} />
                            <button type="submit" className={`btn btn-sm ${action === "settle" ? "btn-primary" : "btn-secondary"}`}>{label}</button>
                          </form>
                        ))}
                      {["published", "live"].includes(r.status) ? (
                        <form action={raceTransitionAction} className="flex gap-1">
                          <input type="hidden" name="raceId" value={r.id} />
                          <input type="hidden" name="action" value="void" />
                          <input name="reason" placeholder="reason" className="input w-28 py-1 text-xs" aria-label="Void reason" />
                          <button type="submit" className="btn btn-danger btn-sm">Void</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">Create a Race</summary>
          <form action={createRaceAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Name<input name="name" required className="input mt-1" defaultValue={`Narrative Race ${(races[0]?.number ?? 0) + 1}`} /></label>
            <label className="text-sm">Locks at (UTC)<input name="locksAt" type="datetime-local" required className="input mt-1" defaultValue={toLocalInput(plus(24 * 4))} /></label>
            <label className="text-sm">Starts at (UTC)<input name="startsAt" type="datetime-local" required className="input mt-1" defaultValue={toLocalInput(plus(24 * 4 + 2))} /></label>
            <label className="text-sm">Ends at (UTC)<input name="endsAt" type="datetime-local" required className="input mt-1" defaultValue={toLocalInput(plus(24 * 11 + 2))} /></label>
            <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Create draft</button></div>
          </form>
        </details>
      </section>

      {/* SNAPSHOTS */}
      {selectedRace ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Snapshots · {selectedRace.name}</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <div className="card max-h-80 overflow-auto p-4">
              <table className="table">
                <thead><tr><th scope="col">Taken</th><th scope="col">Kind</th><th scope="col">Leader</th><th scope="col">Rows</th><th scope="col">Source</th></tr></thead>
                <tbody>
                  {snapshots.length ? snapshots.map((g) => {
                    const top = [...g.rows].sort((a, b) => a.rank - b.rank)[0];
                    return (
                      <tr key={`${g.kind}-${g.takenAt}`}>
                        <td className="mono text-xs">{formatDateTime(g.takenAt)}</td>
                        <td className="text-xs uppercase tracking-wider text-muted">{g.kind}</td>
                        <td className="text-xs">{narratives.find((n) => n.id === top?.narrativeId)?.shortName ?? "—"} {top ? top.score.toFixed(1) : ""}</td>
                        <td className="mono text-xs">{g.rows.length}</td>
                        <td className="text-xs text-dim">{g.rows[0]?.source}</td>
                      </tr>
                    );
                  }) : <tr><td colSpan={5} className="text-sm text-muted">No snapshots yet. Publishing takes the reference and pre-lock snapshots.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card p-4">
              <p className="font-semibold">Data errors</p>
              {unavailable.length ? (
                <ul className="mt-2 space-y-1 text-xs text-coral">
                  {unavailable.slice(0, 20).map((u) => (
                    <li key={u.id}>{formatDateTime(u.takenAt)} · {narratives.find((n) => n.id === u.narrativeId)?.name} unavailable</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No unavailable narratives recorded for this Race.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* NARRATIVES */}
      {selectedNarrative ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Narratives</h2>
          <div className="flex flex-wrap gap-1">
            {narratives.map((n) => (
              <Link key={n.id} href={`/admin?race=${selectedRace?.id ?? ""}&narrative=${n.id}`} className={`btn btn-sm ${n.id === selectedNarrative.id ? "btn-primary" : "btn-secondary"}`}>
                {n.shortName}{!n.active ? " (inactive)" : ""}
              </Link>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <form action={updateNarrativeAction} className="card space-y-3 p-4">
              <input type="hidden" name="narrativeId" value={selectedNarrative.id} />
              <label className="block text-sm">Name<input name="name" required className="input mt-1" defaultValue={selectedNarrative.name} /></label>
              <label className="block text-sm">Description<textarea name="description" className="input mt-1" rows={3} defaultValue={selectedNarrative.description} /></label>
              <div className="flex items-center gap-4">
                <label className="text-sm">Accent<input name="accentColor" type="color" className="ml-2 h-8 w-12 cursor-pointer rounded border border-border bg-transparent" defaultValue={selectedNarrative.accentColor} /></label>
                <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={selectedNarrative.active} /> Active</label>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">Save narrative</button>
            </form>
            <form action={updateConstituentsAction} className="card space-y-3 p-4">
              <input type="hidden" name="narrativeId" value={selectedNarrative.id} />
              <p className="text-sm font-semibold">Constituents (current v{version?.version})</p>
              <label className="block text-sm">
                One per line: <code className="text-xs">SYMBOL,Name,weight</code>
                <textarea name="constituents" className="input mono mt-1 text-xs" rows={6} defaultValue={version?.constituents.map((c) => `${c.symbol},${c.name},${c.weight.toFixed(3)}`).join("\n")} />
              </label>
              <label className="block text-sm">Change note<input name="note" className="input mt-1" placeholder="Why the set changed" /></label>
              <button type="submit" className="btn btn-secondary btn-sm">Create new version</button>
              <p className="text-xs text-dim">Blocked while any Race is live. Every change creates a new immutable version.</p>
            </form>
          </div>
        </section>
      ) : null}

      {/* AUDIT */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <div className="card max-h-96 overflow-auto">
          <table className="table">
            <thead><tr><th scope="col">When</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Details</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="mono text-xs">{formatDateTime(a.createdAt)}</td>
                  <td className="text-xs">{a.actorLabel}</td>
                  <td className="mono text-xs">{a.action}</td>
                  <td className="mono text-xs text-muted">{a.targetType}:{a.targetId.slice(-8)}</td>
                  <td className="mono max-w-xs truncate text-xs text-dim">{JSON.stringify(a.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

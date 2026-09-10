"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Lock, RotateCcw } from "lucide-react";
import type { LineupPick, Narrative, NarrativeSnapshot, PickRole } from "@/lib/types";
import { THESIS_MAX, validatePicks } from "@/lib/scoring/validation";
import { lockLineupAction } from "@/app/race/[raceId]/actions";
import { EnergyAllocator, type EnergyMap } from "./EnergyAllocator";
import { NarrativeIcon } from "./NarrativeIcon";
import { ROLE_META } from "./LineupPicks";
import { RaceCountdown } from "./RaceCountdown";

const ROLES: PickRole[] = ["leader", "challenger", "wildcard"];

export function LineupBuilder({
  raceId,
  locksAt,
  narratives,
  snapshots,
  signedIn,
  demo,
}: {
  raceId: string;
  locksAt: string;
  narratives: Narrative[];
  snapshots: NarrativeSnapshot[];
  signedIn: boolean;
  demo: boolean;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Record<PickRole, string | null>>({ leader: null, challenger: null, wildcard: null });
  const [activeRole, setActiveRole] = useState<PickRole>("leader");
  const [energy, setEnergy] = useState<EnergyMap>({ leader: 50, challenger: 30, wildcard: 20 });
  const [thesis, setThesis] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const snapById = useMemo(() => new Map(snapshots.map((s) => [s.narrativeId, s])), [snapshots]);
  const byId = useMemo(() => new Map(narratives.map((n) => [n.id, n])), [narratives]);
  const roleOf = (id: string) => ROLES.find((r) => selection[r] === id) ?? null;

  const picks: LineupPick[] = ROLES.filter((r) => selection[r]).map((r) => ({ role: r, narrativeId: selection[r]!, energy: energy[r] }));
  const problems = picks.length === 3 ? validatePicks(picks) : ["Pick a Leader, a Challenger and a Wildcard."];
  const ready = problems.length === 0;

  const choose = (id: string) => {
    const existing = roleOf(id);
    if (existing) {
      setSelection((s) => ({ ...s, [existing]: null }));
      setActiveRole(existing);
      return;
    }
    setSelection((s) => {
      const next = { ...s, [activeRole]: id };
      const nextEmpty = ROLES.find((r) => !next[r]);
      if (nextEmpty) setActiveRole(nextEmpty);
      return next;
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await lockLineupAction({ raceId, picks, thesis });
      if (!res.ok) {
        setError(res.error);
        dialogRef.current?.close();
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const sorted = [...narratives].sort((a, b) => (snapById.get(a.id)?.rank ?? 99) - (snapById.get(b.id)?.rank ?? 99));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" data-testid="lineup-builder">
      <section aria-labelledby="field-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="field-heading" className="text-lg font-semibold">
            1 · Draft the field
          </h2>
          <p className="text-xs text-muted">
            Picking for <span className="font-mono uppercase tracking-wider" style={{ color: ROLE_META[activeRole].color }}>{ROLE_META[activeRole].label}</span>. Click a narrative to assign it.
          </p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Role to assign">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={activeRole === r}
              onClick={() => setActiveRole(r)}
              className={`card-2 flex-1 px-3 py-2 text-left transition ${activeRole === r ? "ring-2 ring-offset-0" : "hover:border-cyan/40"}`}
              style={activeRole === r ? { borderColor: ROLE_META[r].color, boxShadow: `0 0 0 1px ${ROLE_META[r].color}` } : undefined}
              data-testid={`slot-${r}`}
            >
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em]" style={{ color: ROLE_META[r].color }}>
                {ROLE_META[r].label}
              </span>
              <span className="block truncate text-sm">{selection[r] ? byId.get(selection[r]!)?.name : <span className="text-dim">{ROLE_META[r].hint}</span>}</span>
            </button>
          ))}
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Narrative field">
          {sorted.map((n) => {
            const s = snapById.get(n.id);
            const role = roleOf(n.id);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => choose(n.id)}
                  aria-pressed={Boolean(role)}
                  data-testid={`narrative-${n.slug}`}
                  className={`card-2 flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:border-cyan/50 ${role ? "bg-surface" : ""}`}
                  style={role ? { borderColor: ROLE_META[role].color } : undefined}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ background: `${n.accentColor}22`, color: n.accentColor }}>
                    <NarrativeIcon name={n.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.name}</span>
                    <span className="block font-mono text-[0.65rem] text-muted">
                      {s ? `#${s.rank} · score ${s.score.toFixed(1)} · momentum ${s.normalized.momentum.toFixed(0)}` : "no data"}
                    </span>
                  </span>
                  {role ? (
                    <span className="rounded px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider" style={{ background: `${ROLE_META[role].color}22`, color: ROLE_META[role].color }}>
                      {ROLE_META[role].label}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-dim">Pre-lock metrics are from the last 7 days. Starting rank is fixed at lock and used for Wildcard scoring.</p>
      </section>

      <section aria-labelledby="allocate-heading" className="card space-y-5 p-5">
        <h2 id="allocate-heading" className="text-lg font-semibold">
          2 · Allocate 100 Energy
        </h2>
        <EnergyAllocator
          energy={energy}
          onChange={setEnergy}
          labels={{
            leader: selection.leader ? byId.get(selection.leader)?.name : undefined,
            challenger: selection.challenger ? byId.get(selection.challenger)?.name : undefined,
            wildcard: selection.wildcard ? byId.get(selection.wildcard)?.name : undefined,
          }}
        />
        <div>
          <label htmlFor="thesis" className="flex items-center justify-between text-sm font-semibold">
            Thesis <span className="mono text-xs font-normal text-muted">{thesis.length}/{THESIS_MAX}</span>
          </label>
          <textarea
            id="thesis"
            className="input mt-1 min-h-20 resize-y"
            maxLength={THESIS_MAX}
            placeholder="Optional. Why this lineup? Shown on your public Race Card."
            value={thesis}
            onChange={(e) => setThesis(e.target.value.slice(0, THESIS_MAX))}
          />
        </div>

        <div className="card-2 p-3">
          <p className="eyebrow mb-2">Lineup preview</p>
          <ul className="space-y-1 text-sm">
            {ROLES.map((r) => (
              <li key={r} className="flex items-center justify-between">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: ROLE_META[r].color }}>{ROLE_META[r].label}</span>
                <span className="flex-1 truncate px-3">{selection[r] ? byId.get(selection[r]!)?.name : <span className="text-dim">Not picked</span>}</span>
                <span className="mono">{energy[r]}E</span>
              </li>
            ))}
          </ul>
        </div>

        <RaceCountdown target={locksAt} label="Locks in" />

        {problems.length && picks.length === 3 ? (
          <ul className="text-xs text-coral" aria-live="polite">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        ) : null}

        {signedIn ? (
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary flex-1" disabled={!ready || pending} onClick={() => dialogRef.current?.showModal()} data-testid="lock-open">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Lock lineup
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSelection({ leader: null, challenger: null, wildcard: null });
                setActiveRole("leader");
                setEnergy({ leader: 50, challenger: 30, wildcard: 20 });
              }}
              aria-label="Reset lineup"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <Link href={`/login?next=/race/${raceId}`} className="btn btn-primary w-full" data-testid="lock-signin">
            {demo ? "Continue as guest to lock" : "Sign in to lock"}
          </Link>
        )}
        <p className="text-[0.7rem] text-dim">Locked lineups are final. Virtual Energy only — nothing is staked.</p>
      </section>

      <dialog ref={dialogRef} className="card m-auto w-[min(92vw,28rem)] p-0 text-ink backdrop:bg-bg/80" aria-labelledby="confirm-title">
        <form method="dialog" className="space-y-4 p-5" onSubmit={(e) => e.preventDefault()}>
          <h3 id="confirm-title" className="text-lg font-semibold">Lock this lineup?</h3>
          <p className="text-sm text-muted">Once locked it cannot be edited or deleted. Crowd Picks will be revealed after you lock.</p>
          <ul className="space-y-1 text-sm">
            {picks.map((p) => (
              <li key={p.role} className="flex justify-between">
                <span style={{ color: ROLE_META[p.role].color }}>{ROLE_META[p.role].label}</span>
                <span>{byId.get(p.narrativeId)?.name}</span>
                <span className="mono">{p.energy}E</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={pending} data-testid="lock-confirm">
              {pending ? "Locking…" : "Confirm lock"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

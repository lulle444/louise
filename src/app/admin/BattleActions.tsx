"use client";

import { useActionState } from "react";
import type { AIProfile, Battle, BattleStatus } from "@/lib/domain/types";
import { settleWithOverrideAction, toggleAIProfileAction, transitionBattleAction, type AdminActionState } from "@/lib/actions/admin";

const initial: AdminActionState = { ok: true, message: "" };

function ActionButton({ battleId, action, label, tone = "default", reason }: { battleId: string; action: string; label: string; tone?: "default" | "primary" | "danger"; reason?: string }) {
  const [state, run, pending] = useActionState<AdminActionState, FormData>(transitionBattleAction, initial);
  const cls = tone === "primary" ? "bg-cyan text-bg" : tone === "danger" ? "border border-bear/50 text-bear hover:bg-bear/10" : "border border-border hover:bg-surface-2";
  return (
    <form action={run} className="inline-flex flex-col gap-1">
      <input type="hidden" name="battleId" value={battleId} />
      <input type="hidden" name="action" value={action} />
      {reason !== undefined ? <input type="hidden" name="reason" value={reason} /> : null}
      <button type="submit" disabled={pending} className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${cls}`}>{pending ? "…" : label}</button>
      {state.message ? <span className={`text-[11px] ${state.ok ? "text-bull" : "text-bear"}`} role="status">{state.message}</span> : null}
    </form>
  );
}

function AIToggle({ battleId, profile, enabled, locked }: { battleId: string; profile: AIProfile; enabled: boolean; locked: boolean }) {
  const [state, run, pending] = useActionState<AdminActionState, FormData>(toggleAIProfileAction, initial);
  return (
    <form action={run} className="inline-flex items-center gap-1">
      <input type="hidden" name="battleId" value={battleId} />
      <input type="hidden" name="aiProfileId" value={profile.id} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <button type="submit" disabled={pending} className={`rounded-md border px-2 py-1 font-mono text-[11px] ${enabled ? "border-transparent" : "border-border text-muted"}`} style={enabled ? { background: `${profile.accentColor}22`, color: profile.accentColor } : undefined} aria-pressed={enabled} title={locked ? "Forecast already locked" : enabled ? "Disable for this Battle" : "Enable for this Battle"}>
        {profile.name}{locked ? " ✓" : ""}
      </button>
      {state.message && !state.ok ? <span className="text-[11px] text-bear" role="status">{state.message}</span> : null}
    </form>
  );
}

function OverrideForm({ battleId }: { battleId: string }) {
  const [state, run, pending] = useActionState<AdminActionState, FormData>(settleWithOverrideAction, initial);
  return (
    <form action={run} className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-3">
      <input type="hidden" name="battleId" value={battleId} />
      <div>
        <label className="text-[11px] font-semibold" htmlFor={`price-${battleId}`}>Manual end price (audited)</label>
        <input id={`price-${battleId}`} name="price" type="number" step="any" min="0" required className="mt-1 w-40 rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-sm" />
      </div>
      <div className="min-w-[14rem] flex-1">
        <label className="text-[11px] font-semibold" htmlFor={`reason-${battleId}`}>Reason</label>
        <input id={`reason-${battleId}`} name="reason" required minLength={3} maxLength={240} className="mt-1 w-full rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-sm" placeholder="Provider outage; price verified against exchange close" />
      </div>
      <button type="submit" disabled={pending} className="rounded-md border border-neutral/50 px-3 py-1.5 text-xs font-semibold text-neutral hover:bg-neutral/10 disabled:opacity-60">{pending ? "…" : "Settle with override"}</button>
      {state.message ? <p className={`w-full text-[11px] ${state.ok ? "text-bull" : "text-bear"}`} role="status">{state.message}</p> : null}
    </form>
  );
}

export function BattleActions({ battle, status, aiProfiles, lockedAiIds, ended }: { battle: Battle; status: BattleStatus; aiProfiles: AIProfile[]; lockedAiIds: string[]; ended: boolean }) {
  const terminal = battle.status === "settled" || battle.status === "void" || battle.status === "archived";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {battle.status === "draft" ? <ActionButton battleId={battle.id} action="publish" label="Publish" tone="primary" /> : null}
        {(status === "upcoming" || status === "open") && !terminal ? <ActionButton battleId={battle.id} action="lock" label="Lock now" /> : null}
        {!terminal && battle.status !== "draft" ? <ActionButton battleId={battle.id} action="settle" label={ended ? "Settle now" : "Settle (not ready)"} tone="primary" /> : null}
        {!terminal && battle.status !== "draft" ? <ActionButton battleId={battle.id} action="void" label="Void" tone="danger" reason="Voided by admin" /> : null}
        {(battle.status === "settled" || battle.status === "void" || battle.status === "draft") ? <ActionButton battleId={battle.id} action="archive" label="Archive" /> : null}
        {battle.status === "archived" ? <ActionButton battleId={battle.id} action="unarchive" label="Unarchive" /> : null}
      </div>
      {!terminal ? (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-muted">AI profiles for this Battle</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {aiProfiles.map((p) => <AIToggle key={p.id} battleId={battle.id} profile={p} enabled={battle.aiProfileIds.includes(p.id)} locked={lockedAiIds.includes(p.id)} />)}
          </div>
        </div>
      ) : null}
      {!terminal && battle.status !== "draft" && ended ? <OverrideForm battleId={battle.id} /> : null}
    </div>
  );
}

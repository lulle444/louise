"use client";

import { useActionState } from "react";
import type { AIProfile, Asset } from "@/lib/domain/types";
import { createBattleAction, type AdminActionState } from "@/lib/actions/admin";

function utcInput(d: Date): string {
  return d.toISOString().slice(0, 16);
}

export function CreateBattleForm({ assets, aiProfiles, defaultOpensAt }: { assets: Asset[]; aiProfiles: AIProfile[]; defaultOpensAt: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(createBattleAction, { ok: true, message: "" });
  const tomorrow = new Date(defaultOpensAt);
  const cls = "mt-1 w-full rounded-md border border-border bg-surface-2/40 px-3 py-2 text-sm focus:border-cyan";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="assetId" className="text-xs font-semibold">Asset</label>
        <select id="assetId" name="assetId" className={cls} required>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="title" className="text-xs font-semibold">Title <span className="font-normal text-muted">(optional)</span></label>
        <input id="title" name="title" className={cls} placeholder="BTC Daily Round" maxLength={80} />
      </div>
      <div>
        <label htmlFor="neutralThresholdPercent" className="text-xs font-semibold">Neutral threshold (%)</label>
        <input id="neutralThresholdPercent" name="neutralThresholdPercent" type="number" step="0.05" min="0" max="25" defaultValue="0.5" className={cls} required />
      </div>
      <div className="flex items-end">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="publish" className="size-4 accent-cyan" /> Publish immediately</label>
      </div>
      <div>
        <label htmlFor="opensAt" className="text-xs font-semibold">Opens at (UTC)</label>
        <input id="opensAt" name="opensAt" type="datetime-local" defaultValue={utcInput(tomorrow)} className={cls} required />
      </div>
      <div>
        <label htmlFor="locksAt" className="text-xs font-semibold">Locks at (UTC)</label>
        <input id="locksAt" name="locksAt" type="datetime-local" defaultValue={utcInput(new Date(tomorrow.getTime() + 12 * 3600_000))} className={cls} required />
      </div>
      <div>
        <label htmlFor="endsAt" className="text-xs font-semibold">Ends at (UTC)</label>
        <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={utcInput(new Date(tomorrow.getTime() + 24 * 3600_000))} className={cls} required />
      </div>
      <fieldset>
        <legend className="text-xs font-semibold">AI profiles</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {aiProfiles.map((p) => (
            <label key={p.id} className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" name="aiProfileIds" value={p.id} defaultChecked className="size-4 accent-cyan" /> <span style={{ color: p.accentColor }}>{p.name}</span></label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${state.ok ? "text-bull" : "text-bear"}`} role={state.message ? "status" : undefined}>{state.message}</p>
        <button type="submit" disabled={pending} className="rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">{pending ? "Creating…" : "Create Round"}</button>
      </div>
      <p className="sm:col-span-2 lg:col-span-4 text-[11px] text-muted">Times entered here are interpreted as UTC (a “Z” suffix is applied server-side).</p>
    </form>
  );
}

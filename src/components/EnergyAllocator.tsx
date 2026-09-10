"use client";

import type { PickRole } from "@/lib/types";
import { ROLE_META } from "./LineupPicks";
import { ENERGY_TOTAL } from "@/lib/scoring/validation";
import { EnergyRing } from "./EnergyRing";

export type EnergyMap = Record<PickRole, number>;

const ROLES: PickRole[] = ["leader", "challenger", "wildcard"];

export function EnergyAllocator({
  energy,
  onChange,
  labels,
  disabled = false,
}: {
  energy: EnergyMap;
  onChange: (next: EnergyMap) => void;
  labels: Partial<Record<PickRole, string>>;
  disabled?: boolean;
}) {
  const total = ROLES.reduce((s, r) => s + energy[r], 0);
  const remaining = ENERGY_TOTAL - total;

  const set = (role: PickRole, value: number) => {
    const v = Math.max(0, Math.min(ENERGY_TOTAL, Math.round(Number.isFinite(value) ? value : 0)));
    onChange({ ...energy, [role]: v });
  };
  const balance = () => {
    // Distribute the remainder proportionally, then fix rounding on the last role.
    const sum = total || 1;
    const next = { ...energy };
    let left = ENERGY_TOTAL;
    ROLES.forEach((r, i) => {
      if (i === ROLES.length - 1) next[r] = left;
      else {
        next[r] = total ? Math.round((energy[r] / sum) * ENERGY_TOTAL) : [50, 30, 20][i];
        left -= next[r];
      }
    });
    onChange(next);
  };
  const preset = (values: [number, number, number]) => onChange({ leader: values[0], challenger: values[1], wildcard: values[2] });

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold">Energy allocation</span>
        <span className={`mono text-sm ${remaining === 0 ? "text-primary" : "text-coral"}`} aria-live="polite" data-testid="energy-total">
          {total} / {ENERGY_TOTAL}
          {remaining !== 0 ? ` (${remaining > 0 ? `${remaining} left` : `${-remaining} over`})` : " ✓"}
        </span>
      </legend>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto sm:mx-0">
          <EnergyRing energy={energy} size={112} />
        </div>
        <div className="space-y-3">
      {ROLES.map((role) => (
        <div key={role} className="grid grid-cols-[6rem_1fr_4.5rem] items-center gap-3">
          <label htmlFor={`energy-${role}`} className="text-xs">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em]" style={{ color: ROLE_META[role].color }}>
              {ROLE_META[role].label}
            </span>
            <span className="block truncate text-muted">{labels[role] ?? "—"}</span>
          </label>
          <input
            id={`energy-${role}`}
            type="range"
            min={0}
            max={ENERGY_TOTAL}
            step={1}
            value={energy[role]}
            onChange={(e) => set(role, Number(e.target.value))}
            className="range"
            style={{ accentColor: ROLE_META[role].color }}
            aria-valuetext={`${energy[role]} Energy`}
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={ENERGY_TOTAL}
            step={1}
            value={energy[role]}
            onChange={(e) => set(role, Number(e.target.value))}
            className="input mono px-2 py-1 text-right text-sm"
            aria-label={`${ROLE_META[role].label} Energy`}
            data-testid={`energy-input-${role}`}
          />
        </div>
      ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset([50, 30, 20])}>50 / 30 / 20</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset([34, 33, 33])}>Even</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset([70, 20, 10])}>High conviction</button>
        <button type="button" className="btn btn-secondary btn-sm ml-auto" onClick={balance} disabled={remaining === 0}>
          Auto-balance to 100
        </button>
      </div>
    </fieldset>
  );
}

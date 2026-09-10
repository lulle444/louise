"use client";

import type { PickRole } from "@/lib/types";
import { ROLE_META } from "./LineupPicks";

const ROLES: PickRole[] = ["leader", "challenger", "wildcard"];

/** Donut showing the Energy split. Segments morph as the allocation changes. */
export function EnergyRing({ energy, size = 120 }: { energy: Record<PickRole, number>; size?: number }) {
  const total = ROLES.reduce((s, r) => s + energy[r], 0);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ok = total === 100;
  const segments = ROLES.reduce<{ role: PickRole; dash: number; offset: number }[]>((acc, role) => {
    const dash = c * Math.min(1, energy[role] / 100);
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    return [...acc, { role, dash, offset }];
  }, []);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Energy split: ${ROLES.map((x) => `${ROLE_META[x].label} ${energy[x]}`).join(", ")}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E293B" strokeWidth={stroke} />
      {segments.map(({ role, dash, offset }) => (
          <circle
            key={role}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ROLE_META[role].color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="energy-seg"
            opacity={ok ? 1 : 0.55}
          />
      ))}
      <text x="50%" y="46%" dominantBaseline="central" textAnchor="middle" fill={ok ? "#22D3EE" : "#FB7185"} fontSize={size * 0.2} fontWeight={700} fontFamily="ui-monospace, monospace">
        {total}
      </text>
      <text x="50%" y="64%" dominantBaseline="central" textAnchor="middle" fill="#94A3B8" fontSize={size * 0.09} fontFamily="ui-monospace, monospace" letterSpacing="0.15em">
        ENERGY
      </text>
    </svg>
  );
}

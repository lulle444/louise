import { PICK_ROLES, type CrowdPicks, type Lineup, type LineupPick, type PickRole } from "@/lib/types";

/**
 * Aggregate Crowd Picks from human lineups only. AI lineups are always excluded.
 */
export function aggregateCrowd(lineups: Lineup[]): CrowdPicks {
  const humans = lineups.filter((l) => l.kind === "human" && l.status !== "void");
  const sampleSize = humans.length;

  const byRole = {} as CrowdPicks["byRole"];
  for (const role of PICK_ROLES) {
    const counts = new Map<string, { count: number; energy: number }>();
    for (const l of humans) {
      const p = l.picks.find((x) => x.role === role);
      if (!p) continue;
      const cur = counts.get(p.narrativeId) ?? { count: 0, energy: 0 };
      cur.count += 1;
      cur.energy += p.energy;
      counts.set(p.narrativeId, cur);
    }
    byRole[role] = [...counts.entries()]
      .map(([narrativeId, v]) => ({
        narrativeId,
        count: v.count,
        share: sampleSize ? v.count / sampleSize : 0,
        energy: v.energy,
      }))
      .sort((a, b) => b.count - a.count || b.energy - a.energy || a.narrativeId.localeCompare(b.narrativeId));
  }

  const energyTotals = new Map<string, number>();
  let energyAll = 0;
  for (const l of humans) {
    for (const p of l.picks) {
      energyTotals.set(p.narrativeId, (energyTotals.get(p.narrativeId) ?? 0) + p.energy);
      energyAll += p.energy;
    }
  }
  const conviction = [...energyTotals.entries()]
    .map(([narrativeId, energyTotal]) => ({
      narrativeId,
      energyTotal,
      energyShare: energyAll ? energyTotal / energyAll : 0,
    }))
    .sort((a, b) => b.energyTotal - a.energyTotal || a.narrativeId.localeCompare(b.narrativeId));

  // Consensus lineup: most common per role, resolving duplicates by taking the
  // next-most-common narrative for the later role.
  let consensus: LineupPick[] | null = null;
  if (sampleSize > 0) {
    const used = new Set<string>();
    const picks: LineupPick[] = [];
    for (const role of PICK_ROLES) {
      const candidate = byRole[role].find((c) => !used.has(c.narrativeId));
      if (!candidate) break;
      used.add(candidate.narrativeId);
      const avgEnergy = Math.round(candidate.energy / candidate.count);
      picks.push({ role, narrativeId: candidate.narrativeId, energy: avgEnergy });
    }
    if (picks.length === 3) {
      // Re-balance energy to exactly 100 while keeping integers.
      const total = picks.reduce((s, p) => s + p.energy, 0) || 1;
      let remaining = 100;
      picks.forEach((p, i) => {
        if (i === picks.length - 1) {
          p.energy = remaining;
        } else {
          p.energy = Math.round((p.energy / total) * 100);
          remaining -= p.energy;
        }
      });
      consensus = picks;
    }
  }

  // Biggest disagreement: the role where the top two choices are closest.
  let disagreement: CrowdPicks["disagreement"] = null;
  let smallestGap = Infinity;
  for (const role of PICK_ROLES as PickRole[]) {
    const [top, second] = byRole[role];
    if (!top || !second) continue;
    const gap = top.share - second.share;
    if (gap < smallestGap) {
      smallestGap = gap;
      disagreement = {
        role,
        top: { narrativeId: top.narrativeId, share: top.share },
        second: { narrativeId: second.narrativeId, share: second.share },
      };
    }
  }

  return { sampleSize, byRole, conviction, consensus, disagreement };
}

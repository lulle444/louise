import type { LevelDef } from "@/lib/types";

export const LEVELS: LevelDef[] = [
  { name: "Observer", minXp: 0 },
  { name: "Scout", minXp: 250 },
  { name: "Analyst", minXp: 750 },
  { name: "Strategist", minXp: 1500 },
  { name: "Meta Hunter", minXp: 3000 },
  { name: "Navigator", minXp: 6000 },
];

export interface LevelInfo {
  level: number;
  name: string;
  minXp: number;
  nextMinXp: number | null;
  progress: number; // 0..1 toward next level
}

export function levelForXp(xp: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) idx = i;
  }
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? Math.min(1, (xp - cur.minXp) / (next.minXp - cur.minXp)) : 1;
  return { level: idx + 1, name: cur.name, minXp: cur.minXp, nextMinXp: next?.minXp ?? null, progress };
}

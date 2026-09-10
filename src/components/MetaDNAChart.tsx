"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { MetaDNA } from "@/lib/types";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function MetaDNAChart({ dna, size = 220 }: { dna: MetaDNA; size?: number }) {
  const reduced = useReducedMotion();
  if (!dna.ready) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted" style={{ height: size }} data-testid="dna-building">
        <div>
          <p className="font-semibold text-ink">Building your Meta DNA</p>
          <p className="mt-1 text-xs">{dna.sampleSize}/3 settled Races. Profiles need at least three.</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: size }} role="img" aria-label={`Meta DNA radar: ${dna.axes.map((a) => `${a.label} ${a.value}`).join(", ")}`} data-testid="dna-chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={dna.axes} outerRadius="70%">
          <PolarGrid stroke="#1E293B" />
          <PolarAngleAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="#B6F36B" fill="#B6F36B" fillOpacity={0.25} isAnimationActive={!reduced} animationDuration={900} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ScoreComponents } from "@/lib/domain/types";

const AXES: { key: keyof ScoreComponents; label: string }[] = [
  { key: "delivery", label: "Delivery" },
  { key: "development", label: "Development" },
  { key: "availability", label: "Availability" },
  { key: "transparency", label: "Transparency" },
  { key: "evidence", label: "Evidence" },
];
const COLORS = ["#1f8bf0", "#0f9f7c", "#6a58cf"];

export function CompareRadar({ series }: { series: { name: string; components: ScoreComponents | null }[] }) {
  const data = AXES.map((axis) => {
    const row: Record<string, string | number> = { axis: axis.label };
    series.forEach((s) => {
      row[s.name] = s.components?.[axis.key] ?? 0;
    });
    return row;
  });
  return (
    <figure className="card p-4">
      <figcaption className="mb-2 text-sm font-medium text-ink">Score components at a glance</figcaption>
      <div className="h-72 w-full" role="img" aria-label={`Radar chart of score components for ${series.map((s) => s.name).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#d8e4f2" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#52627a", fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#8a99af", fontSize: 10 }} axisLine={false} />
            {series.map((s, i) => (
              <Radar key={s.name} name={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
            ))}
            <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #d8e4f2", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate">Missing components are drawn as 0 and marked “no data” in the table; they are excluded from the total, not assumed.</p>
    </figure>
  );
}

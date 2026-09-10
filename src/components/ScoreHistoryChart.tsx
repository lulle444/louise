"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export function ScoreHistoryChart({
  data,
  series,
  height = 260,
  yDomain = [0, 100],
  yLabel = "Score",
}: {
  data: Record<string, number | string>[];
  series: SeriesDef[];
  height?: number;
  yDomain?: [number, number];
  yLabel?: string;
}) {
  return (
    <div>
    <div style={{ height }} role="img" aria-label={`${yLabel} over time for ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={{ stroke: "#1E293B" }} tickLine={false} minTickGap={24} />
          <YAxis domain={yDomain} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#0C111B", border: "1px solid #1E293B", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#94A3B8" }}
            formatter={(value, name) => [typeof value === "number" ? value.toFixed(1) : String(value), String(name)]}
          />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={s.key === series[0].key ? 2.5 : 1.5} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-hidden="true">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1 text-[0.65rem] text-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

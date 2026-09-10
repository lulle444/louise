"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({ data }: { data: Array<{ label: string; human: number | null; ai: number | null }> }) {
  if (data.length === 0) return <p className="text-sm text-muted">No settled Rounds yet.</p>;
  return (
    <div className="h-64" role="img" aria-label="Per-Round accuracy of humans versus AI analysts over recent settled Rounds.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#D8DFE8" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#5B6B7F", fontSize: 11 }} axisLine={{ stroke: "#D8DFE8" }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#5B6B7F", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #D8DFE8", color: "#0F1A2B", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="human" name="Humans" stroke="#0E8F7E" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="ai" name="AI analysts" stroke="#C2410C" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 3" connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

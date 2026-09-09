"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({ data }: { data: Array<{ label: string; human: number | null; ai: number | null }> }) {
  if (data.length === 0) return <p className="text-sm text-muted">No settled Battles yet.</p>;
  return (
    <div className="h-64" role="img" aria-label="Per-Battle accuracy of humans versus AI analysts over recent settled Battles.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#1E293B" }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ background: "#0C111B", border: "1px solid #1E293B", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="human" name="Humans" stroke="#21D4FD" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="ai" name="AI analysts" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 3" connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

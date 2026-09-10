"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";

export function SignalDNAChart({ data, accent = "#0E8F7E" }: { data: Array<{ axis: string; value: number }>; accent?: string }) {
  const summary = data.map((d) => `${d.axis} ${d.value}`).join(", ");
  return (
    <div className="h-64 sm:h-72" role="img" aria-label={`Call Profile radar. ${summary}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#D8DFE8" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#5B6B7F", fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

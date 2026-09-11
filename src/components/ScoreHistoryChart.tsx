"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ShipScoreSnapshot } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";

export function ScoreHistoryChart({ history }: { history: ShipScoreSnapshot[] }) {
  const data = history.map((s) => ({
    date: formatDate(s.calculatedAt, { month: "short", day: "numeric" }),
    total: s.total,
    version: s.formulaVersion,
    completeness: Math.round(s.dataCompleteness * 100),
  }));
  const labelled = history.filter((s) => s.total !== null);
  return (
    <figure>
      <div className="h-48 w-full" role="img" aria-label={`Ship Score history: ${labelled.map((s) => `${formatDate(s.calculatedAt)} ${s.total}`).join(", ") || "no scores yet"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#d8e4f2" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="#b7cbe3" tick={{ fill: "#52627a", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} stroke="#b7cbe3" tick={{ fill: "#52627a", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #d8e4f2", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#14294b" }}
              formatter={(value, _name, item) => {
                const payload = item?.payload as { version?: string; completeness?: number } | undefined;
                return [value === null ? "Insufficient data" : `${value} / 100`, `Ship Score (${payload?.version ?? ""}, data ${payload?.completeness ?? 0}%)`];
              }}
            />
            <Line type="monotone" dataKey="total" stroke="#1f8bf0" strokeWidth={2} dot={{ r: 3, fill: "#1f8bf0" }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-slate">
        Stored snapshots with their formula version. Gaps mark periods with insufficient data. Historical snapshots are never rewritten.
      </figcaption>
      <table className="sr-only">
        <caption>Ship Score snapshots</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Total</th>
            <th>Formula</th>
          </tr>
        </thead>
        <tbody>
          {history.map((s) => (
            <tr key={s.id}>
              <td>{formatDate(s.calculatedAt)}</td>
              <td>{s.total ?? "Insufficient data"}</td>
              <td>{s.formulaVersion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

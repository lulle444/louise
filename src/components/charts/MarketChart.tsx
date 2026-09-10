"use client";

import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PricePoint } from "@/lib/market/provider";
import { formatPrice } from "@/lib/domain/format";

export function MarketChart({ series, startPrice, decimals, simulated, height = 180, opensAt, endsAt }: { series: PricePoint[]; startPrice: number | null; decimals: number; simulated: boolean; height?: number; opensAt?: string; endsAt?: string }) {
  if (series.length < 2) {
    return <div className="grid h-40 place-items-center rounded-lg border border-dashed border-border text-sm text-muted">No chart data available.</div>;
  }
  const data = series.map((p) => ({ t: Date.parse(p.time), price: p.price }));
  const min = Math.min(...data.map((d) => d.price));
  const max = Math.max(...data.map((d) => d.price));
  const pad = (max - min) * 0.15 || max * 0.01;
  const last = data[data.length - 1].price;
  const up = startPrice ? last >= startPrice : true;
  const stroke = up ? "#0E8F7E" : "#0F1A2B";
  return (
    <figure>
      <div style={{ height }} role="img" aria-label={`Price series from $${formatPrice(data[0].price, decimals)} to $${formatPrice(last, decimals)}${startPrice ? `, Battle start price $${formatPrice(startPrice, decimals)}` : ""}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
            <YAxis domain={[min - pad, max + pad]} hide />
            <Tooltip
              contentStyle={{ background: "#FFFFFF", border: "1px solid #D8DFE8", color: "#0F1A2B", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)" }}
              labelFormatter={(v) => new Date(Number(v)).toUTCString().replace(" GMT", " UTC")}
              formatter={(v) => [`$${formatPrice(Number(v), decimals)}`, "Price"]}
            />
            {startPrice ? <ReferenceLine y={startPrice} stroke="#5B6B7F" strokeDasharray="4 4" /> : null}
            {opensAt ? <ReferenceLine x={Date.parse(opensAt)} stroke="#0E8F7E" strokeOpacity={0.6} strokeDasharray="3 3" /> : null}
            {endsAt && Date.parse(endsAt) <= data[data.length - 1].t ? <ReferenceLine x={Date.parse(endsAt)} stroke="#C2410C" strokeOpacity={0.6} strokeDasharray="3 3" /> : null}
            <Area type="monotone" dataKey="price" stroke={stroke} strokeWidth={2} fill="url(#chartFill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
        <span>{simulated ? "Simulated series · demo data" : "Historical series · provider data"}</span>
        <span>Dashed line: Round start price</span>
      </figcaption>
    </figure>
  );
}

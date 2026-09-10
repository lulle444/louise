import { getRepository } from "@/lib/data";
import { getMarketDataProvider } from "@/lib/market";
import type { PricePoint } from "@/lib/market/provider";
import { formatPercent, formatPrice } from "@/lib/domain/format";
import { AssetMark } from "./AssetMark";
import { Sparkline } from "@/components/charts/Sparkline";
import { DataUnavailable } from "@/components/ui/States";

interface Row {
  symbol: string;
  name: string;
  decimals: number;
  price: number | null;
  change24h: number | null;
  change7d: number | null;
  series: PricePoint[];
}

/** Live (or simulated, in Demo Mode) 7-day view of the Arena's assets. */
export async function MarketStrip() {
  const repo = await getRepository();
  const provider = getMarketDataProvider();
  const assets = await repo.listAssets();
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86_400_000);
  const rows: Row[] = await Promise.all(
    assets.map(async (a) => {
      try {
        const [current, series] = await Promise.all([provider.getCurrentPrice(a.symbol), provider.getPriceSeries(a.symbol, from, now, 56)]);
        const dayAgo = series.length ? series.reduce((best, p) => (Math.abs(Date.parse(p.time) - (now.getTime() - 86_400_000)) < Math.abs(Date.parse(best.time) - (now.getTime() - 86_400_000)) ? p : best), series[0]) : null;
        const first = series[0] ?? null;
        return {
          symbol: a.symbol,
          name: a.name,
          decimals: a.priceDecimals,
          price: current.price,
          change24h: dayAgo ? ((current.price - dayAgo.price) / dayAgo.price) * 100 : null,
          change7d: first ? ((current.price - first.price) / first.price) * 100 : null,
          series,
        };
      } catch {
        return { symbol: a.symbol, name: a.name, decimals: a.priceDecimals, price: null, change24h: null, change7d: null, series: [] };
      }
    }),
  );
  const anyData = rows.some((r) => r.price !== null);
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6" aria-label="Markets">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Arena markets · 7 days</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{provider.isMock ? "Simulated series" : `Live via ${provider.name}`}</p>
      </div>
      {!anyData ? (
        <DataUnavailable what="Market data" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {rows.map((r) => {
            const up = (r.change7d ?? 0) >= 0;
            return (
              <div key={r.symbol} className="card card-hover flex items-center gap-4 p-4">
                <AssetMark symbol={r.symbol} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{r.name} <span className="font-mono text-xs text-muted">{r.symbol}</span></p>
                  <p className="num mt-1 text-lg font-semibold">{r.price === null ? <span className="text-sm text-neutral">Unavailable</span> : `$${formatPrice(r.price, r.decimals)}`}</p>
                  <p className="num text-xs">
                    <span className={r.change24h === null ? "text-muted" : r.change24h >= 0 ? "text-bull" : "text-bear"}>{formatPercent(r.change24h)} 24h</span>
                    <span className="text-muted"> · </span>
                    <span className={r.change7d === null ? "text-muted" : r.change7d >= 0 ? "text-bull" : "text-bear"}>{formatPercent(r.change7d)} 7d</span>
                  </p>
                </div>
                <Sparkline series={r.series} positive={up} className="shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

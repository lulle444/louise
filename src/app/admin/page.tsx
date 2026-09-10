import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getViewer } from "@/lib/auth/session";
import { getMarketDataProvider } from "@/lib/market";
import { isDemoMode } from "@/lib/config";
import { effectiveStatus } from "@/lib/domain/settlement";
import { formatPercent, formatPrice } from "@/lib/domain/format";
import { PageHeader } from "@/components/ui/Section";
import { StatusPill, DirectionPill } from "@/components/ui/Pills";
import { LocalTime } from "@/components/ui/LocalTime";
import { AssetMark } from "@/components/arena/AssetMark";
import { CreateBattleForm } from "./CreateBattleForm";
import { BattleActions } from "./BattleActions";
import { MaintenanceButton } from "./MaintenanceButton";
import { getMaintenanceStatus } from "@/lib/services/maintenance";
import { isAutoScheduleEnabled } from "@/lib/services/scheduler";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  const viewer = await getViewer();
  // Server-side authorization: ordinary users and visitors never reach admin data.
  if (!viewer) redirect("/login?next=/admin");
  if (!viewer.isAdmin) redirect("/arena?denied=admin");

  const repo = await getRepository();
  const provider = getMarketDataProvider();
  const [battles, assets, aiProfiles, predictions, aiPredictions, runs, audit] = await Promise.all([
    repo.listBattles({ includeUnpublished: true }),
    repo.listAssets(),
    repo.listAIProfiles(),
    repo.listPredictions(),
    repo.listAIPredictions(),
    repo.listSettlementRuns(),
    repo.listAudit(30),
  ]);
  let providerStatus: { ok: boolean; detail: string } = { ok: false, detail: "" };
  try {
    const p = await provider.getCurrentPrice("BTC");
    providerStatus = { ok: true, detail: `${p.source}${provider.isMock ? " (simulated)" : ""} · BTC $${formatPrice(p.price)} @ ${p.timestamp.slice(11, 19)} UTC` };
  } catch (err) {
    providerStatus = { ok: false, detail: err instanceof Error ? err.message : "Provider error" };
  }
  const lastRun = runs[0] ?? null;
  const maintenance = getMaintenanceStatus();
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const now = new Date();
  const ordered = [...battles].sort((a, b) => Date.parse(b.opensAt) - Date.parse(a.opensAt));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Battle console" description={<>Signed in as <span className="text-text">{viewer.displayName}</span>. Every action is validated server-side and written to the audit log.{isDemoMode() ? " Demo Mode: changes live in server memory and reset on restart." : ""}</>} />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Health">
          <div className={`card p-4 ${providerStatus.ok ? "" : "border-bear/40"}`}>
            <p className="text-[11px] uppercase tracking-wider text-muted">Price provider</p>
            <p className={`mt-1 font-semibold ${providerStatus.ok ? "text-bull" : "text-bear"}`}>{providerStatus.ok ? "Healthy" : "Unavailable"}</p>
            <p className="num mt-1 text-xs text-muted">{providerStatus.detail}</p>
          </div>
          <div className={`card p-4 ${lastRun?.status === "failed" ? "border-bear/40" : ""}`}>
            <p className="text-[11px] uppercase tracking-wider text-muted">Last settlement run</p>
            {lastRun ? (
              <>
                <p className={`mt-1 font-semibold ${lastRun.status === "succeeded" ? "text-bull" : lastRun.status === "failed" ? "text-bear" : "text-neutral"}`}>{lastRun.status}</p>
                <p className="num mt-1 text-xs text-muted">{lastRun.source} · <LocalTime iso={lastRun.startedAt} />{lastRun.error ? ` · ${lastRun.error}` : ""}</p>
              </>
            ) : <p className="mt-1 text-sm text-muted">No runs yet</p>}
          </div>
          <div className="card p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">Participation</p>
            <p className="num mt-1 font-semibold">{predictions.length} human · {aiPredictions.length} AI forecasts</p>
            <p className="mt-1 text-xs text-muted">{battles.filter((b) => b.status === "settled").length} settled · {battles.filter((b) => b.status === "void").length} void · {battles.filter((b) => b.status === "draft").length} draft</p>
          </div>
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4 p-5" aria-labelledby="maint-heading">
          <div>
            <h2 id="maint-heading" className="text-base font-semibold">Scheduler and settlement</h2>
            <p className="mt-1 text-xs text-muted">
              Auto-schedule is {isAutoScheduleEnabled() ? "on" : "off"}: Daily Battles open 00:00 UTC, lock 12:00 UTC, settle 00:00 UTC (BTC → ETH → SOL). Runs from cron, on page views (throttled), or manually here.
            </p>
            <p className="num mt-1 text-xs text-muted">
              Last run: {maintenance.lastRunAt ? <><LocalTime iso={maintenance.lastRunAt} /> via {maintenance.lastSource}{maintenance.lastReport ? ` · ${maintenance.lastReport.scheduled.length} scheduled, ${maintenance.lastReport.settled.length} settled${maintenance.lastReport.errors.length ? `, ${maintenance.lastReport.errors.length} error(s): ${maintenance.lastReport.errors.join(" | ")}` : ""}` : ""}{maintenance.lastError ? ` · failed: ${maintenance.lastError}` : ""}</> : "not yet on this server instance"}
            </p>
          </div>
          <MaintenanceButton />
        </section>

        <section className="card p-5" aria-labelledby="create-heading">
          <h2 id="create-heading" className="text-base font-semibold">Create a Battle</h2>
          <p className="mb-4 text-xs text-muted">Times are entered in UTC. Publishing captures the start-price snapshot at open time and locks AI forecasts.</p>
          <CreateBattleForm assets={assets} aiProfiles={aiProfiles} defaultOpensAt={new Date(Math.ceil(now.getTime() / 86_400_000) * 86_400_000).toISOString()} />
        </section>

        <section aria-labelledby="battles-heading">
          <h2 id="battles-heading" className="mb-3 text-base font-semibold">Battles <span className="num text-sm font-normal text-muted">({battles.length})</span></h2>
          <div className="space-y-3">
            {ordered.map((b) => {
              const asset = assetById.get(b.assetId);
              const status = effectiveStatus(b, now);
              const humans = predictions.filter((p) => p.battleId === b.id).length;
              const ai = aiPredictions.filter((p) => p.battleId === b.id);
              const change = b.startPrice && b.endPrice ? ((b.endPrice - b.startPrice) / b.startPrice) * 100 : null;
              return (
                <details key={b.id} className="card group">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4 text-sm">
                    <AssetMark symbol={asset?.symbol ?? "?"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{b.title} <span className="font-mono text-xs text-muted">{b.slug}</span></span>
                      <span className="block text-xs text-muted"><LocalTime iso={b.opensAt} /> → lock <LocalTime iso={b.locksAt} withDate={false} /> → end <LocalTime iso={b.endsAt} /></span>
                    </span>
                    <span className="num text-xs text-muted">{humans}H · {ai.length}AI</span>
                    {b.outcome ? <DirectionPill direction={b.outcome} size="sm" /> : null}
                    <StatusPill status={status} />
                    {b.settlementError ? <span className="rounded bg-bear/10 px-2 py-0.5 text-[11px] text-bear">error</span> : null}
                  </summary>
                  <div className="border-t border-border p-4">
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-[11px] uppercase tracking-wider text-muted">Start snapshot</dt><dd className="num mt-0.5">{b.startPrice ? `$${formatPrice(b.startPrice, asset?.priceDecimals)}` : "—"}</dd><dd className="text-[11px] text-muted">{b.startPriceAt ? <LocalTime iso={b.startPriceAt} /> : "not captured"}</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-wider text-muted">End snapshot</dt><dd className="num mt-0.5">{b.endPrice ? `$${formatPrice(b.endPrice, asset?.priceDecimals)}` : "—"}</dd><dd className="text-[11px] text-muted">{b.endPriceAt ? <LocalTime iso={b.endPriceAt} /> : "not captured"}{b.settlementSource ? ` · ${b.settlementSource}` : ""}</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-wider text-muted">Change / threshold</dt><dd className="num mt-0.5">{formatPercent(change)} / ±{b.neutralThresholdPercent}%</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-wider text-muted">Stored status</dt><dd className="mt-0.5 font-mono text-xs">{b.status}</dd></div>
                    </dl>
                    {b.settlementError ? <p className="mt-3 rounded-md border border-bear/40 bg-bear/10 px-3 py-2 text-xs text-bear" role="alert">Settlement error: {b.settlementError}</p> : null}
                    <div className="mt-4">
                      <BattleActions battle={b} status={status} aiProfiles={aiProfiles} lockedAiIds={ai.map((p) => p.aiProfileId)} ended={now.getTime() >= Date.parse(b.endsAt)} />
                    </div>
                    <div className="mt-3 flex gap-3 text-xs">
                      <Link href={`/arena/${b.id}`} className="text-cyan hover:underline">Public page →</Link>
                      <span className="text-muted">Runs: {runs.filter((r) => r.battleId === b.id).map((r) => `${r.status} (${r.source})`).join(", ") || "none"}</span>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="card overflow-hidden" aria-labelledby="audit-heading">
          <h2 id="audit-heading" className="border-b border-border px-5 py-4 text-base font-semibold">Audit log</h2>
          {audit.length === 0 ? <p className="p-5 text-sm text-muted">No audit events yet.</p> : (
            <ul className="divide-y divide-border text-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="num w-40 text-xs text-muted"><LocalTime iso={a.createdAt} /></span>
                  <span className="font-mono text-xs text-cyan">{a.action}</span>
                  <span className="font-mono text-xs text-muted">{a.targetType}:{a.targetId ?? "—"}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">{JSON.stringify(a.details)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

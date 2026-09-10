import Link from "next/link";
import { Users } from "lucide-react";
import type { BattleSummary } from "@/lib/services/battle-view";
import { battleDurationLabel, formatPercent, formatPrice } from "@/lib/domain/format";
import { LocalTime } from "@/components/ui/LocalTime";
import { DirectionPill, StatusPill } from "@/components/ui/Pills";
import { BattleCountdown } from "./BattleCountdown";
import { AssetMark } from "./AssetMark";

export function BattleCard({ summary, compact = false }: { summary: BattleSummary; compact?: boolean }) {
  const { battle, asset, status, participantCount, viewerState, change } = summary;
  const live = status === "open";
  const ended = status === "settled" || status === "void";
  const viewerLabel = viewerState === "not-entered" ? (live ? "Not entered" : null) : viewerState === "locked" ? "Locked" : viewerState === "void" ? "Void" : "Settled";
  return (
    <Link
      href={`/rounds/${battle.id}`}
      className={`card card-hover block p-4 ${live ? "border-cyan/30" : ""}`}
      aria-label={`${battle.title}, ${status}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AssetMark symbol={asset.symbol} />
          <div>
            <p className="font-semibold leading-tight">{asset.name} <span className="font-mono text-xs text-muted">{asset.symbol}</span></p>
            <p className="text-xs text-muted">Daily Round · {battleDurationLabel(battle.opensAt, battle.endsAt)}</p>
          </div>
        </div>
        <StatusPill status={status} />
      </div>
      <dl className={`mt-4 grid gap-3 text-sm ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted">Start price</dt>
          <dd className="num mt-0.5">{battle.startPrice ? `$${formatPrice(battle.startPrice, asset.priceDecimals)}` : "Captured at open"}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted">{ended ? "Final change" : status === "upcoming" ? "Opens in" : status === "open" ? "Locks in" : "Settles in"}</dt>
          <dd className="num mt-0.5">
            {ended ? (
              <span className={change === null ? "text-muted" : change > 0 ? "text-bull" : change < 0 ? "text-bear" : "text-neutral"}>{formatPercent(change)}</span>
            ) : (
              <BattleCountdown target={status === "upcoming" ? battle.opensAt : status === "open" ? battle.locksAt : battle.endsAt} />
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted">{ended ? "Outcome" : "Window"}</dt>
          <dd className="mt-0.5">
            {ended ? <DirectionPill direction={battle.outcome} size="sm" /> : <span className="text-xs text-muted"><LocalTime iso={battle.opensAt} withDate={false} /> → <LocalTime iso={battle.endsAt} withDate={false} /></span>}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted">Participants</dt>
          <dd className="num mt-0.5 inline-flex items-center gap-1"><Users className="size-3.5 text-muted" aria-hidden /> {participantCount}</dd>
        </div>
      </dl>
      {viewerLabel ? (
        <p className={`mt-3 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-wider ${viewerState === "locked" ? "text-cyan" : viewerState === "settled" ? "text-bull" : "text-muted"}`}>
          You: {viewerLabel}
        </p>
      ) : null}
    </Link>
  );
}

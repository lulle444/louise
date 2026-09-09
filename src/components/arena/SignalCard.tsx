import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import type { AIProfile, Asset, Battle, Direction, PredictionResult, Profile, Signal } from "@/lib/domain/types";
import { battleDurationLabel, formatPercent, formatPrice, formatUtc } from "@/lib/domain/format";
import { Avatar } from "@/components/ui/Avatar";
import { DirectionPill, ResultPill } from "@/components/ui/Pills";
import { SignalIcon } from "@/components/ui/SignalIcon";

export interface SignalCardData {
  id: string;
  kind: "human" | "ai";
  owner: { name: string; username: string | null; accentColor?: string; isAI: boolean };
  asset: Pick<Asset, "symbol" | "name" | "priceDecimals">;
  battle: Pick<Battle, "id" | "opensAt" | "locksAt" | "endsAt" | "startPrice" | "endPrice" | "outcome" | "status" | "neutralThresholdPercent">;
  direction: Direction;
  signals: Signal[];
  confidence: number;
  thesis: string | null;
  lockedAt: string;
  referencePrice: number | null;
  result: PredictionResult;
  battleScore: number | null;
  xpAwarded?: number | null;
  streakAfter?: number | null;
  beatAI?: string[];
}

export function toSignalCardData(input: {
  id: string;
  kind: "human" | "ai";
  profile?: Profile | null;
  aiProfile?: AIProfile | null;
  asset: Asset;
  battle: Battle;
  direction: Direction;
  signalIds: string[];
  allSignals: Signal[];
  confidence: number;
  thesis: string | null;
  lockedAt: string;
  referencePrice: number | null;
  result: PredictionResult;
  battleScore: number | null;
  xpAwarded?: number | null;
  streakAfter?: number | null;
  beatAI?: string[];
}): SignalCardData {
  const owner = input.aiProfile
    ? { name: `${input.aiProfile.name} AI`, username: null, accentColor: input.aiProfile.accentColor, isAI: true }
    : { name: input.profile?.displayName ?? "Analyst", username: input.profile?.username ?? null, isAI: false };
  return {
    id: input.id,
    kind: input.kind,
    owner,
    asset: input.asset,
    battle: input.battle,
    direction: input.direction,
    signals: input.signalIds.map((id) => input.allSignals.find((s) => s.id === id)).filter((s): s is Signal => Boolean(s)),
    confidence: input.confidence,
    thesis: input.thesis,
    lockedAt: input.lockedAt,
    referencePrice: input.referencePrice,
    result: input.result,
    battleScore: input.battleScore,
    xpAwarded: input.xpAwarded ?? null,
    streakAfter: input.streakAfter ?? null,
    beatAI: input.beatAI,
  };
}

function ConfidenceDots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Confidence ${value} of 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-3 rounded-sm ${i <= value ? "bg-cyan" : "bg-border"}`} aria-hidden />
      ))}
      <span className="num ml-1 text-xs text-muted">{value}/5</span>
    </span>
  );
}

export function SignalCard({ data, preview = false, showLink = true, className = "" }: { data: SignalCardData; preview?: boolean; showLink?: boolean; className?: string }) {
  const settled = data.result === "correct" || data.result === "incorrect";
  const voided = data.result === "void";
  const change = data.battle.startPrice && data.battle.endPrice ? ((data.battle.endPrice - data.battle.startPrice) / data.battle.startPrice) * 100 : null;
  const accent = data.owner.accentColor ?? (settled ? (data.result === "correct" ? "#34D399" : "#FB7185") : "#21D4FD");
  const duration = battleDurationLabel(data.battle.opensAt, data.battle.endsAt);

  const srSummary = `${data.owner.name} forecast ${data.direction} on ${data.asset.symbol} ${duration} citing ${data.signals.map((s) => s.name).join(", ")} with confidence ${data.confidence} of 5, locked ${formatUtc(data.lockedAt)}. ${settled ? `Result: ${data.result}${change !== null ? `, market moved ${formatPercent(change)}` : ""}.` : voided ? "Battle void." : "Battle pending."}`;

  return (
    <article className={`card relative overflow-hidden ${className}`} style={{ boxShadow: `0 0 0 1px ${accent}33, 0 24px 48px -32px ${accent}66` }} aria-label={srSummary}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} aria-hidden />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>
              {settled ? "Signal Verified" : voided ? "Signal Void" : preview ? "Signal Preview" : "Signal Arena"}
            </p>
            <p className="num mt-1 text-lg font-semibold">
              {data.asset.symbol} · {settled && change !== null ? <span className={change > 0 ? "text-bull" : change < 0 ? "text-bear" : "text-neutral"}>{formatPercent(change)}</span> : duration}
            </p>
          </div>
          {settled ? <ResultPill result={data.result} /> : voided ? <ResultPill result="void" /> : (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
              <Lock className="size-3" aria-hidden /> {preview ? "Preview" : "Locked"}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <DirectionPill direction={data.direction} size="lg" />
          <ConfidenceDots value={data.confidence} />
        </div>

        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Signals">
          {data.signals.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs" style={{ color: s.accentColor }}>
              <SignalIcon name={s.icon} className="size-3.5" /> <span className="text-text">{s.name}</span>
            </li>
          ))}
        </ul>

        {data.thesis ? <p className="mt-4 border-l-2 border-border pl-3 text-sm text-text/90">“{data.thesis}”</p> : null}

        {settled ? (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div><p className="text-muted">Outcome</p><p className="mt-0.5"><DirectionPill direction={data.battle.outcome} size="sm" /></p></div>
            <div><p className="text-muted">Battle Score</p><p className="num mt-0.5 font-semibold">{data.battleScore ?? 0}</p></div>
            {data.kind === "human" ? <div><p className="text-muted">XP earned</p><p className="num mt-0.5 font-semibold text-cyan">+{data.xpAwarded ?? 0}</p></div> : null}
            {data.streakAfter ? <div><p className="text-muted">Streak</p><p className="num mt-0.5 font-semibold">{data.streakAfter}-day</p></div> : null}
            {data.beatAI && data.beatAI.length > 0 ? <div className="col-span-2"><p className="text-muted">Beat</p><p className="mt-0.5 font-semibold text-violet">{data.beatAI.join(" · ")} AI</p></div> : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            {data.owner.isAI ? (
              <span className="grid size-7 place-items-center rounded-full font-mono text-[10px] font-bold" style={{ background: `${accent}22`, color: accent }} aria-hidden>AI</span>
            ) : (
              <Avatar name={data.owner.name} size="sm" />
            )}
            {data.owner.username && showLink ? (
              <Link href={`/profile/${data.owner.username}`} className="text-sm hover:underline">{data.owner.name}</Link>
            ) : (
              <span className="text-sm">{data.owner.name}</span>
            )}
          </div>
          <p className="num text-[11px] uppercase tracking-wider text-muted">
            {preview ? "Locks on confirm" : `Locked · ${formatUtc(data.lockedAt)}`}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <span className="num">{data.referencePrice ? `Ref $${formatPrice(data.referencePrice, data.asset.priceDecimals)}` : data.battle.startPrice ? `Start $${formatPrice(data.battle.startPrice, data.asset.priceDecimals)}` : ""}</span>
          {!preview ? <span className="num inline-flex items-center gap-1"><ShieldCheck className="size-3" aria-hidden /> timestamped and locked · {data.id}</span> : null}
        </div>
      </div>
    </article>
  );
}

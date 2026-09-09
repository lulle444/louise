import Link from "next/link";
import { Bot } from "lucide-react";
import type { AIPrediction, AIProfile, Direction, Signal } from "@/lib/domain/types";
import { formatAccuracy } from "@/lib/domain/format";
import { DirectionPill, ResultPill } from "@/components/ui/Pills";
import { SignalIcon } from "@/components/ui/SignalIcon";

export function AIProfileCard({ profile, accuracy, valid, streak, rating, children }: { profile: AIProfile; accuracy?: number | null; valid?: number; streak?: number; rating?: number; children?: React.ReactNode }) {
  return (
    <article className="card p-5" style={{ boxShadow: `inset 0 1px 0 ${profile.accentColor}33` }}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg" style={{ background: `${profile.accentColor}1f`, color: profile.accentColor, boxShadow: `inset 0 0 0 1px ${profile.accentColor}55` }}>
          <Bot className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-mono text-sm font-semibold tracking-[0.15em]" style={{ color: profile.accentColor }}>{profile.name}</p>
          <p className="text-xs text-muted">{profile.tagline}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{profile.description}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-dim">Rule-based simulation · {profile.strategyVersion}</p>
      {accuracy !== undefined ? (
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          <div><dt className="text-[10px] uppercase tracking-wider text-muted">Accuracy</dt><dd className="num mt-1 text-lg font-semibold">{formatAccuracy(accuracy)}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wider text-muted">Settled</dt><dd className="num mt-1 text-lg font-semibold">{valid ?? 0}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wider text-muted">Rating</dt><dd className="num mt-1 text-lg font-semibold">{rating?.toFixed(1) ?? "—"}</dd></div>
        </dl>
      ) : null}
      {streak !== undefined && streak > 0 ? <p className="mt-2 text-center font-mono text-[11px] text-bull">{streak}-Battle streak</p> : null}
      {children}
    </article>
  );
}

export function AIPositionCard({ profile, prediction, signals, viewerDirection, settled }: { profile: AIProfile; prediction: AIPrediction; signals: Signal[]; viewerDirection?: Direction | null; settled: boolean }) {
  const cited = prediction.signalIds.map((id) => signals.find((s) => s.id === id)).filter((s): s is Signal => Boolean(s));
  const agree = viewerDirection ? viewerDirection === prediction.direction : null;
  return (
    <article className="card p-4" style={{ boxShadow: `inset 0 1px 0 ${profile.accentColor}44` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md font-mono text-[10px] font-bold" style={{ background: `${profile.accentColor}22`, color: profile.accentColor }} aria-hidden>AI</span>
          <p className="font-mono text-xs font-semibold tracking-[0.15em]" style={{ color: profile.accentColor }}>{profile.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {settled ? <ResultPill result={prediction.result} /> : null}
          <DirectionPill direction={prediction.direction} size="sm" />
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${profile.name} signals`}>
        {cited.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted"><SignalIcon name={s.icon} className="size-3" /> {s.name}</li>
        ))}
        <li className="num ml-auto text-[11px] text-muted">Conf. {prediction.confidence}/5</li>
      </ul>
      {prediction.thesis ? <p className="mt-2 text-xs text-muted">“{prediction.thesis}”</p> : null}
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-dim num">Locked {new Date(prediction.lockedAt).toISOString().slice(11, 16)} UTC · {prediction.strategyVersion}</span>
        {agree !== null ? <span className={agree ? "text-cyan" : "text-neutral"}>{agree ? "Agrees with you" : "Disagrees with you"}</span> : null}
      </div>
      <Link href={`/signal/${prediction.id}`} className="mt-2 inline-block text-[11px] text-cyan hover:underline">View Signal Card →</Link>
    </article>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, X } from "lucide-react";
import type { Asset, Battle, Direction, Profile, Signal } from "@/lib/domain/types";
import { SIGNALS_PER_PREDICTION, THESIS_MAX_LENGTH } from "@/lib/config";
import { formatNeutralBand } from "@/lib/domain/settlement";
import { lockPredictionAction } from "@/lib/actions/predictions";
import { DIRECTION_META } from "@/components/ui/Pills";
import { SignalIcon } from "@/components/ui/SignalIcon";
import { SignalCard, toSignalCardData } from "./SignalCard";

const DIRECTIONS: Direction[] = ["bullish", "neutral", "bearish"];

export function DirectionSelector({ value, onChange, threshold }: { value: Direction | null; onChange: (d: Direction) => void; threshold: number }) {
  const band = formatNeutralBand(threshold);
  const help: Record<Direction, string> = {
    bullish: `Closes more than +${threshold}% above the start price`,
    neutral: `Closes inside ${band} of the start price`,
    bearish: `Closes more than ${threshold}% below the start price`,
  };
  return (
    <fieldset>
      <legend className="text-sm font-semibold">1. Market direction</legend>
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Market direction">
        {DIRECTIONS.map((d) => {
          const m = DIRECTION_META[d];
          const selected = value === d;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(d)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition ${selected ? `${m.border} ${m.bg} ${m.color}` : "border-border bg-surface-2/40 text-muted hover:border-border-strong hover:text-text"}`}
            >
              <m.Icon className="size-5" aria-hidden />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider">{m.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted" aria-live="polite">{value ? help[value] : `Neutral means the close lands within ${band} of the start price.`}</p>
    </fieldset>
  );
}

export function SignalSelector({ signals, value, onChange }: { signals: Signal[]; value: string[]; onChange: (ids: string[]) => void }) {
  const full = value.length >= SIGNALS_PER_PREDICTION;
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (!full) onChange([...value, id]);
  }
  return (
    <fieldset>
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold">2. Supporting signals</legend>
        <span className={`num text-xs ${full ? "text-cyan" : "text-muted"}`} aria-live="polite">{value.length} of {SIGNALS_PER_PREDICTION} selected</span>
      </div>
      <p className="mt-1 text-xs text-muted">Pick exactly three reasons behind your call. {full ? "Deselect one to swap." : ""}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {signals.map((s) => {
          const selected = value.includes(s.id);
          const disabled = !selected && full;
          return (
            <button
              key={s.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-disabled={disabled}
              onClick={() => toggle(s.id)}
              title={s.description}
              className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition ${selected ? "border-cyan/60 bg-cyan/10" : disabled ? "cursor-not-allowed border-border/60 opacity-50" : "border-border bg-surface-2/40 hover:border-border-strong"}`}
            >
              <span className={`mt-0.5 shrink-0 ${selected ? "text-cyan" : "text-muted"}`}><SignalIcon name={s.icon} className="size-4" /></span>
              <span>
                <span className="block text-xs font-semibold">{s.name}</span>
                <span className="mt-0.5 hidden text-[11px] leading-snug text-muted sm:block">{s.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ConfidenceSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const labels = ["", "Speculative", "Low", "Moderate", "High", "Conviction"];
  return (
    <fieldset>
      <legend className="text-sm font-semibold">3. Confidence</legend>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Confidence from 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5, ${labels[n]}`}
            onClick={() => onChange(n)}
            className={`num h-11 flex-1 rounded-lg border text-sm font-semibold transition ${value !== null && n <= value ? "border-cyan/60 bg-cyan/15 text-cyan" : "border-border bg-surface-2/40 text-muted hover:border-border-strong"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted" aria-live="polite">{value ? `${value}/5 · ${labels[value]}. Confidence is recorded for calibration and does not multiply your score.` : "Recorded for calibration analysis. It does not multiply your score."}</p>
    </fieldset>
  );
}

export function ThesisInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const over = value.length > THESIS_MAX_LENGTH;
  return (
    <div>
      <label htmlFor="thesis" className="text-sm font-semibold">4. Thesis <span className="font-normal text-muted">(optional)</span></label>
      <textarea
        id="thesis"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={THESIS_MAX_LENGTH + 40}
        placeholder="Why this direction? One or two sentences the crowd can learn from."
        className={`mt-2 w-full resize-none rounded-lg border bg-surface-2/40 px-3 py-2 text-sm placeholder:text-dim focus:border-cyan ${over ? "border-bear" : "border-border"}`}
        aria-describedby="thesis-count"
      />
      <p id="thesis-count" className={`num mt-1 text-right text-xs ${over ? "text-bear" : "text-muted"}`}>{value.length}/{THESIS_MAX_LENGTH}</p>
    </div>
  );
}

export function PredictionComposer({ battle, asset, signals, viewerProfile, signedIn }: { battle: Battle; asset: Asset; signals: Signal[]; viewerProfile: Profile | null; signedIn: boolean }) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction | null>(null);
  const [signalIds, setSignalIds] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [thesis, setThesis] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  const valid = direction !== null && signalIds.length === SIGNALS_PER_PREDICTION && confidence !== null && thesis.trim().length <= THESIS_MAX_LENGTH;

  const preview = useMemo(() => {
    if (!direction || !confidence) return null;
    return toSignalCardData({
      id: "preview",
      kind: "human",
      profile: viewerProfile ?? { id: "you", username: "you", displayName: "You", avatarUrl: null, bio: null, xp: 0, currentStreak: 0, longestStreak: 0, isAdmin: false, createdAt: "", updatedAt: "" },
      asset,
      battle,
      direction,
      signalIds,
      allSignals: signals,
      confidence,
      thesis: thesis.trim() || null,
      lockedAt: new Date().toISOString(),
      referencePrice: battle.startPrice,
      result: "pending",
      battleScore: null,
    });
  }, [direction, confidence, signalIds, thesis, asset, battle, signals, viewerProfile]);

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirming(false);
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLButtonElement>("button[data-primary]")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  function submit() {
    if (!valid || !direction || !confidence) return;
    setError(null);
    startTransition(async () => {
      const res = await lockPredictionAction({ battleId: battle.id, direction, signalIds, confidence, thesis: thesis.trim() });
      if (!res.ok) {
        setError(res.error ?? "Could not lock the call.");
        setConfirming(false);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (!signedIn) {
    return (
      <div className="card p-5">
        <h2 className="text-base font-semibold">Make your call</h2>
        <p className="mt-1 text-sm text-muted">Sign in to lock a forecast for this Round. Calls are timestamped, immutable and scored when the Round settles.</p>
        <a href={`/login?next=/rounds/${battle.id}`} className="mt-4 inline-flex rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Sign in to enter</a>
      </div>
    );
  }

  return (
    <div className="card p-5" data-testid="composer">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Make your call</h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{asset.symbol} · 24H</span>
      </div>
      <div className="mt-5 space-y-6">
        <DirectionSelector value={direction} onChange={setDirection} threshold={battle.neutralThresholdPercent} />
        <SignalSelector signals={signals} value={signalIds} onChange={setSignalIds} />
        <ConfidenceSelector value={confidence} onChange={setConfidence} />
        <ThesisInput value={thesis} onChange={setThesis} />
      </div>

      {preview ? (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">5. Preview your Call Card</p>
          <SignalCard data={preview} preview showLink={false} />
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-bear/40 bg-bear/10 px-3 py-2 text-sm text-bear" role="alert"><AlertCircle className="size-4" aria-hidden /> {error}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Locked calls cannot be edited or deleted after submission.</p>
        <button
          type="button"
          disabled={!valid || pending}
          onClick={() => setConfirming(true)}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan px-5 py-2.5 text-sm font-semibold text-white shadow-glow-cyan transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          data-testid="lock-button"
        >
          <Lock className="size-4" aria-hidden /> Lock your call
        </button>
      </div>

      {confirming && preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-4 backdrop-blur-sm sm:items-center" onClick={() => !pending && setConfirming(false)}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="confirm-title" className="text-base font-semibold">Confirm and lock</h3>
                <p className="mt-1 text-sm text-muted">Locked calls cannot be edited or deleted after submission. Your Call Card becomes public and timestamped immediately.</p>
              </div>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-md p-1 text-muted hover:text-text" aria-label="Cancel"><X className="size-5" aria-hidden /></button>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-surface-2/40 p-3 text-sm">
              <p><span className="text-muted">Direction:</span> <span className={DIRECTION_META[preview.direction].color}>{DIRECTION_META[preview.direction].label}</span></p>
              <p className="mt-1"><span className="text-muted">Signals:</span> {preview.signals.map((s) => s.name).join(" · ")}</p>
              <p className="mt-1"><span className="text-muted">Confidence:</span> {preview.confidence}/5</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-2">Go back</button>
              <button type="button" data-primary onClick={submit} disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60" data-testid="confirm-lock">
                <Lock className="size-4" aria-hidden /> {pending ? "Locking…" : "Lock it"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

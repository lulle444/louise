import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getViewer } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/config";
import { loadSignalCard } from "@/lib/services/signal-card";
import { effectiveStatus } from "@/lib/domain/settlement";
import { canRevealCrowd } from "@/lib/domain/crowd";
import { formatPercent, formatUtc } from "@/lib/domain/format";
import { SignalCard } from "@/components/arena/SignalCard";
import { ShareActions } from "@/components/arena/ShareActions";
import { LocalTime } from "@/components/ui/LocalTime";
import { StatusPill } from "@/components/ui/Pills";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { EmptyState } from "@/components/ui/States";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/call/[callId]">): Promise<Metadata> {
  const { callId } = await props.params;
  const predictionId = callId;
  const repo = await getRepository();
  const card = await loadSignalCard(repo, predictionId);
  if (!card) return { title: "Call Card" };
  const settled = card.result === "correct" || card.result === "incorrect";
  const change = card.battle.startPrice && card.battle.endPrice ? ((card.battle.endPrice - card.battle.startPrice) / card.battle.startPrice) * 100 : null;
  const title = settled ? `${card.asset.symbol} ${formatPercent(change)} · ${card.result.toUpperCase()} · ${card.owner.name}` : `${card.direction.toUpperCase()} on ${card.asset.symbol} · ${card.owner.name}`;
  const description = `${card.signals.map((s) => s.name).join(" · ")} · Confidence ${card.confidence}/5 · Locked ${formatUtc(card.lockedAt)}. Educational forecasting game using virtual points.`;
  return {
    title,
    description,
    openGraph: { title: `${title} · CALLSCORE`, description, type: "article", url: `${getAppUrl()}/signal/${card.id}` },
    twitter: { card: "summary_large_image", title: `${title} · CALLSCORE`, description },
  };
}

export default async function SignalPage(props: PageProps<"/call/[callId]">) {
  const { callId } = await props.params;
  const predictionId = callId;
  const [repo, viewer] = await Promise.all([getRepository(), getViewer()]);
  const card = await loadSignalCard(repo, predictionId);
  if (!card) notFound();

  // Game integrity: while a Battle is open, another analyst's card is only
  // visible to viewers who have locked their own forecast in that Battle.
  const status = effectiveStatus(card.battle);
  const isOwner = viewer && card.owner.username && viewer.username === card.owner.username;
  if (status === "open" && !isOwner) {
    const viewerLocked = viewer ? (await repo.listPredictions({ battleId: card.battle.id, userId: viewer.id })).length > 0 : false;
    if (!canRevealCrowd({ viewerHasLocked: viewerLocked, battleAcceptingPredictions: true })) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <EmptyState title="This Call Card is sealed until you lock" description={`${card.owner.name} locked a forecast in a Round that is still open. Lock your own call to reveal other analysts' positions — Callscore never lets the crowd shape your thesis.`} action={{ href: `/rounds/${card.battle.id}`, label: "Enter this Round" }} />
        </div>
      );
    }
  }

  const url = `${getAppUrl()}/signal/${card.id}`;
  const settled = card.result === "correct" || card.result === "incorrect";
  const shareText = settled
    ? `${card.result === "correct" ? "✔ CORRECT" : "✘ Incorrect"} — ${card.direction.toUpperCase()} on ${card.asset.symbol}${card.beatAI?.length ? ` · Beat ${card.beatAI.join(", ")} AI` : ""}${card.streakAfter ? ` · ${card.streakAfter}-day streak` : ""} · CALLSCORE`
    : `${card.direction.toUpperCase()} on ${card.asset.symbol} · ${card.signals.map((s) => s.name).join(" · ")} · Confidence ${card.confidence}/5 · locked on Callscore`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Public Call Card</p>
        <StatusPill status={status} />
      </div>
      <SignalCard data={card} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ShareActions url={url} text={shareText} />
        <Link href={`/rounds/${card.battle.id}`} className="text-sm text-cyan hover:underline">Open the Round →</Link>
      </div>
      <dl className="card mt-6 grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
        <div><dt className="text-[11px] uppercase tracking-wider text-muted">Identifier</dt><dd className="num mt-0.5 break-all text-xs">{card.id}</dd></div>
        <div><dt className="text-[11px] uppercase tracking-wider text-muted">Locked at</dt><dd className="mt-0.5"><LocalTime iso={card.lockedAt} /></dd></div>
        <div><dt className="text-[11px] uppercase tracking-wider text-muted">Round window</dt><dd className="mt-0.5 text-xs"><LocalTime iso={card.battle.opensAt} /> → <LocalTime iso={card.battle.endsAt} /></dd></div>
        <div><dt className="text-[11px] uppercase tracking-wider text-muted">Start price</dt><dd className="num mt-0.5">{card.battle.startPrice ? `$${card.battle.startPrice.toLocaleString("en-US", { maximumFractionDigits: card.asset.priceDecimals })}` : "—"}</dd></div>
        <div><dt className="text-[11px] uppercase tracking-wider text-muted">End price</dt><dd className="num mt-0.5">{card.battle.endPrice ? `$${card.battle.endPrice.toLocaleString("en-US", { maximumFractionDigits: card.asset.priceDecimals })}` : settled ? "—" : "Pending"}</dd></div>
        <div><dt className="text-[11px] uppercase tracking-wider text-muted">Author</dt><dd className="mt-0.5">{card.owner.isAI ? `${card.owner.name} (rule-based simulation)` : <Link href={`/profile/${card.owner.username}`} className="text-cyan hover:underline">@{card.owner.username}</Link>}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-muted">This card is timestamped and locked on Callscore database. It is not an on-chain record.</p>
      <div className="mt-6"><Disclaimer compact /></div>
    </div>
  );
}

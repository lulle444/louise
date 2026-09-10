import { ImageResponse } from "next/og";
import { getRepository } from "@/lib/data";
import { loadSignalCard } from "@/lib/services/signal-card";
import { formatPercent, formatUtc } from "@/lib/domain/format";

export const alt = "CALLSCORE Call Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = { bullish: "#15803D", neutral: "#B45309", bearish: "#C2313F" } as const;

export default async function OgImage(props: { params: Promise<{ callId: string }> }) {
  const { callId } = await props.params;
  const predictionId = callId;
  const repo = await getRepository();
  const card = await loadSignalCard(repo, predictionId);
  const settled = card && (card.result === "correct" || card.result === "incorrect");
  const change = card?.battle.startPrice && card?.battle.endPrice ? ((card.battle.endPrice - card.battle.startPrice) / card.battle.startPrice) * 100 : null;
  const accent = card ? COLORS[card.direction] : "#21D4FD";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #FFFFFF 0%, #F4F6F9 60%, #E8EEF3 100%)", color: "#0F1A2B", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0E8F7E", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: 22, fontWeight: 800 }}>||||</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>callscore</div>
          </div>
          <div style={{ fontSize: 22, letterSpacing: 6, color: settled ? (card.result === "correct" ? "#15803D" : "#C2313F") : "#5B6B7F", textTransform: "uppercase" }}>
            {card ? (settled ? "Verified call" : card.result === "void" ? "Void" : "Locked call") : "Call Card"}
          </div>
        </div>
        {card ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 40, color: "#5B6B7F" }}>{`${card.asset.symbol} · 24H${settled && change !== null ? ` · ${formatPercent(change)}` : ""}`}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 96, fontWeight: 800, color: accent, letterSpacing: -2, textTransform: "uppercase" }}>{card.direction}</div>
              {settled ? <div style={{ fontSize: 48, fontWeight: 700, color: card.result === "correct" ? "#15803D" : "#C2313F", textTransform: "uppercase", border: `3px solid ${card.result === "correct" ? "#15803D" : "#C2313F"}`, borderRadius: 16, padding: "8px 24px" }}>{card.result}</div> : null}
            </div>
            <div style={{ fontSize: 34, color: "#0F1A2B" }}>{card.signals.map((s) => s.name).join("  ·  ")}</div>
            <div style={{ fontSize: 28, color: "#5B6B7F" }}>{`Confidence ${card.confidence}/5${card.beatAI?.length ? ` · Beat ${card.beatAI.join(", ")} AI` : ""}${card.streakAfter ? ` · ${card.streakAfter}-day streak` : ""}`}</div>
          </div>
        ) : (
          <div style={{ fontSize: 48 }}>Who reads crypto best: you, the crowd, or the machines?</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#5B6B7F" }}>
          <div>{card ? `${card.owner.name}${card.owner.isAI ? " (simulation)" : ""}` : "callscore"}</div>
          <div>{card ? `LOCKED · ${formatUtc(card.lockedAt)}` : "Educational forecasting game · virtual points"}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

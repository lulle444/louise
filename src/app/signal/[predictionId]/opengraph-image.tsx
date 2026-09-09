import { ImageResponse } from "next/og";
import { getRepository } from "@/lib/data";
import { loadSignalCard } from "@/lib/services/signal-card";
import { formatPercent, formatUtc } from "@/lib/domain/format";

export const alt = "SIGNAL ARENA Signal Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = { bullish: "#34D399", neutral: "#FBBF24", bearish: "#FB7185" } as const;

export default async function OgImage(props: { params: Promise<{ predictionId: string }> }) {
  const { predictionId } = await props.params;
  const repo = await getRepository();
  const card = await loadSignalCard(repo, predictionId);
  const settled = card && (card.result === "correct" || card.result === "incorrect");
  const change = card?.battle.startPrice && card?.battle.endPrice ? ((card.battle.endPrice - card.battle.startPrice) / card.battle.startPrice) * 100 : null;
  const accent = card ? COLORS[card.direction] : "#21D4FD";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #06080D 0%, #0C111B 60%, #111827 100%)", color: "#E8EEF8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, border: "2px solid #21D4FD", background: "rgba(33,212,253,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#21D4FD", fontSize: 18, fontWeight: 700 }}>SA</div>
            <div style={{ fontSize: 28, letterSpacing: 8, fontWeight: 700 }}>SIGNAL ARENA</div>
          </div>
          <div style={{ fontSize: 22, letterSpacing: 6, color: settled ? (card.result === "correct" ? "#34D399" : "#FB7185") : "#94A3B8", textTransform: "uppercase" }}>
            {card ? (settled ? "Signal Verified" : card.result === "void" ? "Void" : "Locked") : "Signal Card"}
          </div>
        </div>
        {card ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 40, color: "#94A3B8" }}>{`${card.asset.symbol} · 24H${settled && change !== null ? ` · ${formatPercent(change)}` : ""}`}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 96, fontWeight: 800, color: accent, letterSpacing: -2, textTransform: "uppercase" }}>{card.direction}</div>
              {settled ? <div style={{ fontSize: 48, fontWeight: 700, color: card.result === "correct" ? "#34D399" : "#FB7185", textTransform: "uppercase", border: `3px solid ${card.result === "correct" ? "#34D399" : "#FB7185"}`, borderRadius: 16, padding: "8px 24px" }}>{card.result}</div> : null}
            </div>
            <div style={{ fontSize: 34, color: "#E8EEF8" }}>{card.signals.map((s) => s.name).join("  ·  ")}</div>
            <div style={{ fontSize: 28, color: "#94A3B8" }}>{`Confidence ${card.confidence}/5${card.beatAI?.length ? ` · Beat ${card.beatAI.join(", ")} AI` : ""}${card.streakAfter ? ` · ${card.streakAfter}-day streak` : ""}`}</div>
          </div>
        ) : (
          <div style={{ fontSize: 48 }}>Humans vs AI. Who reads crypto markets best?</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#94A3B8" }}>
          <div>{card ? `${card.owner.name}${card.owner.isAI ? " (simulation)" : ""}` : "SIGNAL ARENA"}</div>
          <div>{card ? `LOCKED · ${formatUtc(card.lockedAt)}` : "Educational forecasting game · virtual points"}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

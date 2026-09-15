import { ImageResponse } from "next/og";

export const alt = "Alphr — You vs the machines. Who calls crypto best?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #FFFFFF 0%, #F4F6F9 60%, #ECEEFF 100%)", color: "#0F1A2B", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #3B1FE3, #4433FF 55%, #6A3BEA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: 26, fontWeight: 800 }}>/\/</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>alphr</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#4433E6", textTransform: "uppercase" }}>The scoreboard for crypto calls</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 74, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            <span>You vs the machines.</span>
            <span style={{ display: "flex", gap: 18 }}><span style={{ color: "#4433E6" }}>Who</span><span>calls crypto</span><span style={{ color: "#15803D" }}>best?</span></span>
          </div>
          <div style={{ fontSize: 28, color: "#5B6B7F" }}>One call a day. Three signals. Locked, timestamped, graded by the market.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#5B6B7F" }}>
          <div>BTC · ETH · SOL · 24h rounds</div>
          <div>Virtual points only · no trades</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

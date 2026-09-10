import { ImageResponse } from "next/og";
import { APP_NAME, APP_SOCIAL_DESCRIPTION } from "@/lib/config";

export const runtime = "edge";
export const alt = `${APP_NAME} — predict the next crypto narrative before the crowd`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LANES = [
  { name: "Privacy", color: "#A3E635", w: 78 },
  { name: "DeFi", color: "#8B5CF6", w: 71 },
  { name: "Gaming", color: "#FB7185", w: 64 },
  { name: "AI", color: "#B6F36B", w: 58 },
  { name: "RWA", color: "#22D3EE", w: 44 },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #06080D 0%, #0C111B 60%, #14102a 100%)",
          color: "#F1F5F9",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#B6F36B", display: "flex", alignItems: "center", justifyContent: "center", color: "#06080D", fontSize: 26, fontWeight: 700 }}>
              ⚡
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>{APP_NAME}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: "#94A3B8" }}>THE CRYPTO NARRATIVE LEAGUE</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>Spot the next narrative before the crowd.</div>
            <div style={{ display: "flex", fontSize: 24, color: "#94A3B8", lineHeight: 1.4 }}>{APP_SOCIAL_DESCRIPTION}</div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#64748B" }}>Educational forecasting game · virtual points only</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, marginLeft: 56, flex: 1 }}>
          {LANES.map((l, i) => (
            <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 14, height: 56, borderRadius: 14, background: "rgba(15,23,42,0.7)", border: "1px solid #1E293B", padding: "0 18px", position: "relative" }}>
              <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: `${l.w}%`, borderRadius: 14, background: `linear-gradient(90deg, ${l.color}33, ${l.color}99)` }} />
              <div style={{ display: "flex", fontSize: 22, color: "#94A3B8", width: 28 }}>{i + 1}</div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700, flex: 1 }}>{l.name}</div>
              <div style={{ display: "flex", fontSize: 22, color: l.color, fontWeight: 700 }}>{(l.w * 0.95).toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

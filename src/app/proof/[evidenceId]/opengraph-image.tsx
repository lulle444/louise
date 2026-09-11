import { ImageResponse } from "next/og";
import { getDataSource } from "@/lib/data";
import { EVIDENCE_TYPE_LABELS } from "@/lib/domain/evidence";
import { STATUS_LABELS } from "@/lib/domain/status";

export const alt = "SHIPTRACE proof card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await params;
  const ds = await getDataSource();
  const evidence = await ds.getEvidence(evidenceId);
  const project = evidence ? await ds.getProjectById(evidence.projectId) : null;
  const milestone = evidence?.milestoneId ? await ds.getMilestone(evidence.milestoneId) : null;
  const verified = evidence?.reviewState === "accepted";
  const accent = verified ? "#49d6a3" : "#f2b84b";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#07090d", color: "#e6ebf2", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>SHIPTRACE · PROOF CARD</div>
          <div style={{ display: "flex", border: `2px solid ${accent}`, color: accent, padding: "8px 18px", borderRadius: 8, fontSize: 22, letterSpacing: 2 }}>
            {verified ? "VERIFIED FROM PUBLIC EVIDENCE" : "PENDING MODERATION"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#5b8cff", letterSpacing: 3 }}>{project ? `${project.name.toUpperCase()} · ${project.category}` : "PROJECT"}</div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.1 }}>{evidence?.title ?? "Evidence record"}</div>
          {milestone ? (
            <div style={{ display: "flex", fontSize: 28, color: "#8a97ab" }}>
              Milestone: {milestone.title} — {STATUS_LABELS[milestone.status]}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#8a97ab" }}>
          <div style={{ display: "flex" }}>{evidence ? EVIDENCE_TYPE_LABELS[evidence.type] : ""}</div>
          <div style={{ display: "flex" }}>Documented delivery, not investment advice</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

import { getDataSource } from "@/lib/data";
import { scoreBand } from "@/lib/domain/score";

export const dynamic = "force-dynamic";

const BAND_COLORS: Record<string, string> = { high: "#0f9f7c", solid: "#1f8bf0", mixed: "#e0a030", low: "#d04552", insufficient: "#8a99af" };

function escape(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Embeddable SVG badge: /badge/<slug>.svg */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.svg$/i, "");
  const ds = await getDataSource();
  const project = await ds.getProjectBySlug(slug);
  if (!project || project.status !== "published") return new Response("Not found", { status: 404 });
  const score = await ds.getLatestScore(project.id);
  const total = score?.total ?? null;
  const band = scoreBand(total);
  const value = total === null ? "insufficient data" : `${total} / 100`;
  const label = "Ship Score";
  const labelWidth = 74;
  const valueWidth = total === null ? 118 : 62;
  const width = labelWidth + valueWidth;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="22" role="img" aria-label="${escape(project.name)} ${label}: ${escape(value)}">
  <title>${escape(project.name)} ${label}: ${escape(value)} — SHIPTRACE</title>
  <clipPath id="r"><rect width="${width}" height="22" rx="5"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="22" fill="#14294b"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="22" fill="${BAND_COLORS[band]}"/>
  </g>
  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
    <text x="${labelWidth / 2}" y="15" font-weight="bold">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15">${escape(value)}</text>
  </g>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}

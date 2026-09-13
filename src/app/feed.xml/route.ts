import { getConfig, SITE } from "@/lib/config";
import { getDataSource } from "@/lib/data";

export const dynamic = "force-dynamic";

function escape(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** RSS 2.0 feed of verified shipping events. */
export async function GET() {
  const base = getConfig().appUrl;
  const ds = await getDataSource();
  const [events, summaries] = await Promise.all([ds.listFeedEvents({ limit: 50, verifiedOnly: true }), ds.listProjectSummaries({ sort: "name" })]);
  const projects = new Map(summaries.map((s) => [s.project.id, s.project]));
  const items = events
    .map((e) => {
      const p = projects.get(e.projectId);
      const link = p && e.milestoneId ? `${base}/projects/${p.slug}/milestones/${e.milestoneId}` : p ? `${base}/projects/${p.slug}` : `${base}/shipping-feed`;
      return `    <item>
      <title>${escape(e.title)}</title>
      <link>${escape(link)}</link>
      <guid isPermaLink="false">${escape(e.id)}</guid>
      <pubDate>${new Date(e.occurredAt).toUTCString()}</pubDate>
      <category>${escape(e.type)}</category>
      <description>${escape(`${e.summary} Source: ${e.sourceUrl}`)}</description>
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SHIPTRACE shipping feed</title>
    <link>${escape(base)}/shipping-feed</link>
    <atom:link href="${escape(base)}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${escape(SITE.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900, s-maxage=900" } });
}

import type { MetadataRoute } from "next";
import { getConfig } from "@/lib/config";
import { getDataSource } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getConfig().appUrl;
  const ds = await getDataSource();
  const summaries = await ds.listProjectSummaries();
  const statics = ["", "/projects", "/compare", "/shipping-feed", "/deadlines", "/methodology", "/token", "/about", "/submit", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const }));
  const projects = summaries.map((s) => ({ url: `${base}/projects/${s.project.slug}`, lastModified: s.project.updatedAt, changeFrequency: "daily" as const }));
  return [...statics, ...projects];
}

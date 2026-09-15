import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/config";
import { getRepository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = ["", "/rounds", "/humans-vs-ai", "/leaderboard", "/weekly", "/learn", "/methodology", "/about"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/rounds" ? "hourly" : "daily",
    priority: p === "" ? 1 : 0.7,
  }));
  try {
    const repo = await getRepository();
    const [battles, profiles] = await Promise.all([repo.listBattles(), repo.listProfiles()]);
    const rounds: MetadataRoute.Sitemap = battles.slice(0, 200).map((b) => ({ url: `${base}/rounds/${b.id}`, lastModified: new Date(b.updatedAt), changeFrequency: "hourly", priority: 0.6 }));
    const people: MetadataRoute.Sitemap = profiles.slice(0, 500).map((p) => ({ url: `${base}/profile/${p.username}`, lastModified: new Date(p.updatedAt), changeFrequency: "daily", priority: 0.4 }));
    return [...staticRoutes, ...rounds, ...people];
  } catch {
    return staticRoutes;
  }
}

import type { MetadataRoute } from "next";
import { getConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = getConfig().appUrl;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/watchlist"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/settings", "/api/"] }],
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}

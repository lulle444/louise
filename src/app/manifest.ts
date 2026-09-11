import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHIPTRACE",
    short_name: "SHIPTRACE",
    description: "Crypto makes promises. We track what ships.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f9fe",
    theme_color: "#1f8bf0",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/arena", destination: "/rounds", permanent: true },
      { source: "/arena/:id", destination: "/rounds/:id", permanent: true },
      { source: "/signal/:id", destination: "/call/:id", permanent: true },
      { source: "/season", destination: "/weekly", permanent: true },
    ];
  },
};

export default nextConfig;

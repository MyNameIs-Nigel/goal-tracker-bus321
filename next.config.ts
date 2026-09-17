import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "goal-tracker-bus321.vercel.app" }],
        destination: "https://bus321.nigel-smith.dev/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

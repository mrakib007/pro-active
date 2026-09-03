import type { NextConfig } from "next";

const backendInternalUrl = (
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        destination: `${backendInternalUrl}/api/:path*`,
        source: "/api/backend/:path*",
      },
    ];
  },
};

export default nextConfig;

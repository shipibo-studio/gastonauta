import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore TypeScript errors during build (for Edge Functions)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

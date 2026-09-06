import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@neercloud/config",
    "@neercloud/db",
    "@neercloud/logger",
    "@neercloud/redis"
  ]
};

export default nextConfig;

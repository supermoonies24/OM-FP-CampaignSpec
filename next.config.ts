import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/node_modules/**", "**/dev.db*", "**/*.db-journal"],
    };
    return config;
  },
};

export default nextConfig;

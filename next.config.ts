import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: the parent home directory isn't a git repo but
  // happens to contain a stray package-lock.json, which would otherwise make
  // Next.js guess a monorepo root and warn on every build.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

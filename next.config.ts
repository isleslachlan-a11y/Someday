import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this project directory so Turbopack
    // doesn't mistake the parent /Users/reallachisles lockfile as the root.
    root: __dirname,
  },
};

export default nextConfig;

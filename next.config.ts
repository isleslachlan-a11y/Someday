import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this project directory so Turbopack
    // doesn't mistake the parent /Users/reallachisles lockfile as the root.
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'jzusuvhdxzthspeghafm.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // next.config.ts changes require a full dev server restart (not hot reload)
    ],
  },
};

export default nextConfig;

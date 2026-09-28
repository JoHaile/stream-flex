import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel's Image Optimization API is unavailable on the Hobby plan, so every
    // <Image> would fail to load. Serve the source directly instead: TMDB's CDN
    // already returns a correctly sized asset because the size segment is baked
    // into the path (/t/p/w1280/...), so the optimizer had almost nothing to add.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;

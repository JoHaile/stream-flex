import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle: OpenNext/Workers deploys this instead of a
  // Node server (also lets `opennextjs-cloudflare build --skipNextBuild` run
  // after a plain `next build`).
  output: "standalone",
  images: {
    // `@opennextjs/cloudflare` serves Next's /_next/image endpoint on top of the
    // Cloudflare Images binding (see wrangler.jsonc), so resizing and AVIF/WebP
    // conversion happen on Cloudflare instead of Vercel's metered optimizer.
    // Keep the buckets few: each distinct (image, width) pair counts as one
    // Cloudflare "unique transformation" (5,000/month on the free plan).
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 1080, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    qualities: [75],
    // Optimized files are page content, not downloads.
    contentDispositionType: "inline",
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

// Single source of truth for the canonical origin. Sitemap, robots.txt and
// metadataBase all resolve absolute URLs from here so the domain can't drift
// between them.
const DEFAULT_SITE_URL = "https://stream-flix-cinema.vercel.app";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL
).replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

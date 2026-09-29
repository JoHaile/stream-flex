import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/utils/site";
import {
  getFeedSection,
  getMediaHref,
  type CatalogSection,
} from "@/utils/catalog";

type SitemapEntry = MetadataRoute.Sitemap[number];

const TMDB_PAGE_SIZE = 20;

// "latest" is excluded: it reads from a third-party JSON feed that isn't
// paginated by TMDB, so its items are already covered by the other sections.
const FEED_SECTIONS: CatalogSection[] = ["trending", "popular", "top-rated"];

const DISCOVER_SECTIONS: CatalogSection[] = [
  "trending",
  "popular",
  "top-rated",
  "latest",
];

const MAX_MOVIE_URLS = 100;
const MAX_TV_URLS = 100;

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: SitemapEntry["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/movies", priority: 0.9, changeFrequency: "daily" },
  { path: "/tv-series", priority: 0.9, changeFrequency: "daily" },
];

// `all` only supports the trending and latest feeds; the other combinations
// call notFound() in the discover page, so they must stay out of the sitemap.
function getDiscoverPaths(): string[] {
  const paths: string[] = [];

  for (const mediaType of ["movie", "tv"] as const) {
    for (const section of DISCOVER_SECTIONS) {
      paths.push(`/discover/${mediaType}/${section}`);
    }
  }

  paths.push("/discover/all/trending", "/discover/all/latest");

  return paths;
}

async function collectMediaIds(
  mediaType: "movie" | "tv",
  limit: number,
): Promise<number[]> {
  const perSection = Math.ceil(limit / FEED_SECTIONS.length);
  const pagesWanted = Math.ceil(perSection / TMDB_PAGE_SIZE);
  const seen = new Set<number>();
  const ordered: number[] = [];

  for (const section of FEED_SECTIONS) {
    for (let page = 1; page <= pagesWanted; page += 1) {
      try {
        const data = await getFeedSection({ mediaType, page, section });

        for (const item of data.results) {
          if (seen.has(item.id)) {
            continue;
          }

          seen.add(item.id);
          ordered.push(item.id);
        }

        // Trending is a small feed and often reports fewer pages than we asked
        // for; stop instead of requesting pages that will 404.
        if (page >= data.total_pages) {
          break;
        }
      } catch (error) {
        console.error(`Sitemap: failed to load ${mediaType}/${section}`, error);
        break;
      }
    }
  }

  return ordered.slice(0, limit);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // lastModified is deliberately omitted. TMDB exposes release and air dates,
  // not content-modified timestamps, and stamping `new Date()` would tell Google
  // every URL changed on every regeneration. A missing lastmod is honest;
  // a fabricated one is not.
  const staticEntries: SitemapEntry[] = [
    ...STATIC_ROUTES.map((route) => ({
      url: absoluteUrl(route.path),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...getDiscoverPaths().map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  const [movieIds, tvIds] = await Promise.all([
    collectMediaIds("movie", MAX_MOVIE_URLS).catch(() => []),
    collectMediaIds("tv", MAX_TV_URLS).catch(() => []),
  ]);

  const detailEntries: SitemapEntry[] = [
    ...movieIds.map((id) => ({
      url: absoluteUrl(getMediaHref({ id, media_type: "movie" })),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...tvIds.map((id) => ({
      url: absoluteUrl(getMediaHref({ id, media_type: "tv" })),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return [...staticEntries, ...detailEntries];
}

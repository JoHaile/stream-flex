import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DiscoverControls from "./DiscoverControls";
import {
  applyFeedFilters,
  getFeedSection,
  getGenreOptions,
  getLatestSection,
  getMediaHref,
  getMediaTitle,
  getMediaTypeOptions,
  getMediaYear,
  getPrimaryGenreLabel,
  getSectionTitle,
  getSortOptions,
  getYearOptions,
  parseCatalogQuery,
  type CatalogMediaType,
  type CatalogSection,
  type LatestMediaType,
  type SearchParamsRecord,
} from "@/utils/catalog";
import { StarIcon } from "lucide-react";
import Pagination from "@/components/shared/Pagination";

type Props = {
  params: Promise<{ mediaType: string; section: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

function isMediaType(value: string): value is CatalogMediaType {
  return ["movie", "tv", "all"].includes(value);
}

function isSection(value: string): value is CatalogSection {
  return ["trending", "popular", "top-rated", "latest"].includes(value);
}

function getDiscoverTitle(mediaType: CatalogMediaType, section: CatalogSection) {
  const sectionTitle = getSectionTitle(section);

  if (mediaType === "movie") {
    return `${sectionTitle} Movies`;
  }

  if (mediaType === "tv") {
    return `${sectionTitle} TV Series`;
  }

  return `${sectionTitle} Titles`;
}

function getDiscoverDescription(
  mediaType: CatalogMediaType,
  section: CatalogSection,
) {
  const noun =
    mediaType === "movie"
      ? "movies"
      : mediaType === "tv"
        ? "TV series"
        : "movies and TV series";

  return `Explore ${section.replace("-", " ")} ${noun} with page-by-page browsing, server-side filters, and smarter discovery controls.`;
}

function getEyebrow(mediaType: CatalogMediaType) {
  if (mediaType === "movie") return "StreamFlix Movies";
  if (mediaType === "tv") return "StreamFlix Series";
  return "StreamFlix";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mediaType, section } = await params;

  if (!isMediaType(mediaType) || !isSection(section)) {
    return {
      title: "Discover | StreamFlix",
    };
  }

  const title = `${getDiscoverTitle(mediaType, section)} | StreamFlix`;
  const description = getDiscoverDescription(mediaType, section);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "StreamFlix",
    },
  };
}

export default async function DiscoverPage({ params, searchParams }: Props) {
  const { mediaType, section } = await params;

  if (!isMediaType(mediaType) || !isSection(section)) {
    notFound();
  }

  if (mediaType === "all" && section !== "trending" && section !== "latest") {
    notFound();
  }

  const query = parseCatalogQuery(await searchParams, mediaType);

  const latestTypeMap: Record<string, LatestMediaType> = {
    movie: "movies",
    tv: "tvshows",
    all: "tvshows",
  };

  const isLatest = section === "latest";
  const feedData = isLatest
    ? await getLatestSection({
        mediaType: latestTypeMap[mediaType] ?? "tvshows",
        page: query.page,
      })
    : await getFeedSection({
        mediaType,
        page: query.page,
        section,
      });
  const items = applyFeedFilters({
    items: feedData.results,
    query,
    routeMediaType: mediaType,
  });
  const activeTypeForGenres =
    mediaType === "all" ? query.type : mediaType;

  const featured = items[0] ?? feedData.results[0];
  const featuredBackdrop = featured?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${featured.backdrop_path}`
    : null;
  const featuredTitle = featured ? getMediaTitle(featured) : getDiscoverTitle(mediaType, section);
  const featuredYear = featured ? getMediaYear(featured) : "";
  const featuredGenre = featured ? getPrimaryGenreLabel(featured, activeTypeForGenres) : "";
  const featuredHref = featured ? getMediaHref(featured, activeTypeForGenres) : "#";

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      {featured ? (
        <section className="relative h-[85vh] min-h-[520px] w-full overflow-hidden">
          {featuredBackdrop ? (
            <Image
              src={featuredBackdrop}
              alt={featuredTitle}
              fill
              preload
              className="object-cover object-top"
              sizes="100vw"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-16">
            <div className="mx-auto max-w-7xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-500">
                {getEyebrow(mediaType)}
              </p>
              <h1 className="mb-3 text-4xl font-black tracking-tight md:text-5xl lg:text-7xl">
                {featuredTitle}
              </h1>

              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                {featuredYear ? (
                  <span className="font-medium text-white/80">{featuredYear}</span>
                ) : null}
                {featuredGenre ? (
                  <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-medium text-white/90">
                    {featuredGenre}
                  </span>
                ) : null}
                {featured?.vote_average ? (
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-4 w-4 fill-red-500 text-red-500" />
                    <span className="font-semibold">
                      {featured.vote_average.toFixed(1)}
                    </span>
                  </div>
                ) : null}
              </div>

              <p className="mb-6 max-w-xl text-sm leading-relaxed text-white/70 line-clamp-3 md:text-base">
                {featured.overview}
              </p>

              <div className="flex items-center gap-3">
                <Link
                  href={featuredHref}
                  className="inline-flex items-center gap-2 rounded px-8 py-2.5 text-sm font-bold bg-white text-black hover:bg-white/90 transition"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </Link>
                <Link
                  href={featuredHref}
                  className="inline-flex items-center gap-2 rounded px-8 py-2.5 text-sm font-semibold bg-white/20 text-white hover:bg-white/30 transition backdrop-blur-sm"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  More Info
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {!isLatest ? (
          <div className="relative z-10 mb-8">
            <DiscoverControls
              defaultGenre={query.genre}
              defaultSort={query.sort}
              defaultYear={query.year}
              defaultType={mediaType === "all" ? query.type : undefined}
              genreOptions={getGenreOptions(activeTypeForGenres)}
              mediaTypeOptions={mediaType === "all" ? getMediaTypeOptions() : undefined}
              pathname={`/discover/${mediaType}/${section}`}
              sortOptions={getSortOptions(section)}
              totalResults={feedData.total_results}
              yearOptions={getYearOptions()}
            />
          </div>
        ) : null}

        {items.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => {
                const resolvedType =
                  mediaType === "all" && item.media_type
                    ? item.media_type
                    : activeTypeForGenres;
                const href = getMediaHref(item, resolvedType);
                const title = getMediaTitle(item);
                const year = getMediaYear(item);
                const genre = getPrimaryGenreLabel(item, activeTypeForGenres);
                const posterUrl = item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : null;
                const itemType = item.media_type === "tv" ? "TV" : "Movie";

                return (
                  <Link key={`${item.media_type ?? mediaType}-${item.id}`} href={href} className="group">
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-zinc-800">
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={title}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-110 group-hover:opacity-60"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
                          {title}
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                        <div className="h-14 w-14 rounded-full border-2 border-white/80 flex items-center justify-center backdrop-blur-sm">
                          <svg className="ml-0.5 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold">
                        <StarIcon className="h-3 w-3 fill-red-500 text-red-500" />
                        {item.vote_average?.toFixed(1) ?? "—"}
                      </div>

                      {mediaType === "all" ? (
                        <div className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                          {itemType}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-2 px-0.5">
                      <h3 className="text-sm font-semibold leading-tight line-clamp-1 group-hover:text-red-400 transition-colors">
                        {title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                        {year ? <span>{year}</span> : null}
                        {genre ? <span>{genre}</span> : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Pagination
              currentPage={query.page}
              pathname={`/discover/${mediaType}/${section}`}
              query={{
                genre: query.genre || undefined,
                sort: query.sort !== "default" ? query.sort : undefined,
                year: query.year || undefined,
                type: mediaType === "all" && query.type !== "all" ? query.type : undefined,
              }}
              totalPages={feedData.total_pages}
            />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-white">No titles match these filters</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
              Try changing the sort order or clearing one of the active filters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

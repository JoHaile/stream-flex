import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  getAnimeCatalogPage,
  getFeedSection,
  getScopedSearch,
  getMediaHref,
  getMediaTitle,
  getMediaYear,
  getPrimaryGenreLabel,
  getSortOptions,
  getYearOptions,
  parseAnimeQuery,
  parseSearchTerm,
  type SearchParamsRecord,
} from "@/utils/catalog";
import AnimeControls from "./AnimeControls";
import { StarIcon } from "lucide-react";
import Pagination from "@/components/shared/Pagination";
import CategorySearch from "@/components/catalog/CategorySearch";

export const metadata: Metadata = {
  title: "Anime & Animation | StreamFlix",
  description:
    "Stream anime and animated movies and series, filtered by format, origin, year and rating.",
  openGraph: {
    title: "Anime & Animation | StreamFlix",
    description: "Browse anime and animation only, powered by TMDB.",
    type: "website",
    siteName: "StreamFlix",
  },
};

type Props = {
  searchParams: Promise<SearchParamsRecord>;
};

function getOriginLabel(origin: string) {
  if (origin === "anime") return "Anime";
  if (origin === "english") return "Western Animation";
  return "Anime & Animation";
}

export default async function AnimePage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = parseAnimeQuery(sp);
  const searchTerm = parseSearchTerm(sp.search);
  const data = searchTerm
    ? await getScopedSearch({
        page: query.page,
        query: searchTerm,
        scope: "anime",
      })
    : await getAnimeCatalogPage({
        format: query.format,
        origin: query.origin,
        page: query.page,
        sort: query.sort,
        year: query.year,
      });

  // The cover leads with a Japanese anime title (AOT, Demon Slayer, etc.)
  // unless the user explicitly filtered to Western animation or is searching.
  const preferJapanese = !searchTerm && query.origin !== "english";
  // Cover art comes from the trending feeds (like the home page) so the hero is
  // a genuinely trending title, filtered down to animation.
  const trending = searchTerm
    ? []
    : (
        await Promise.all([
          getFeedSection({ mediaType: "movie", section: "trending" }),
          getFeedSection({ mediaType: "tv", section: "trending" }),
        ])
      )
        .flatMap((feed) => feed.results)
        .filter((item) => (item.genre_ids ?? []).includes(16));

  const trendingPick = preferJapanese
    ? (trending.find((item) => item.original_language === "ja") ?? trending[0])
    : trending[0];

  const featured = searchTerm
    ? undefined
    : (trendingPick ??
      (preferJapanese
        ? (data.results.find((item) => item.original_language === "ja") ??
          data.results[0])
        : data.results[0]));
  const featuredBackdrop = featured?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${featured.backdrop_path}`
    : null;
  const featuredTitle = featured ? getMediaTitle(featured) : "Anime";
  const featuredYear = featured ? getMediaYear(featured) : "";
  const featuredGenre = featured
    ? getPrimaryGenreLabel(featured, featured.media_type === "tv" ? "tv" : "movie")
    : "";
  const featuredHref = featured
    ? getMediaHref(featured, featured.media_type === "tv" ? "tv" : "movie")
    : "#";

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
                StreamFlix {getOriginLabel(query.origin)}
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
                <span className="rounded bg-red-500/90 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  {featured.media_type === "tv" ? "Series" : "Movie"}
                </span>
                {featured.vote_average ? (
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

      <main className="page-container pb-16">
        <div className="relative z-10 space-y-3 pt-6">
          <CategorySearch
            placeholder="Search anime & animation only…"
            scope="anime"
            scopeLabel="Anime"
          />
          <AnimeControls
            defaultFormat={query.format}
            defaultOrigin={query.origin}
            defaultSort={query.sort}
            defaultYear={query.year}
            pathname="/anime"
            sortOptions={getSortOptions("catalog")}
            totalResults={data.total_results}
            yearOptions={getYearOptions()}
          />
        </div>

        {searchTerm ? (
          <p className="mt-5 text-xs text-zinc-500">
            Results for{" "}
            <span className="font-semibold text-zinc-200">“{searchTerm}”</span> in
            anime &amp; animation
          </p>
        ) : null}

        {data.results.length ? (
          <div className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {data.results.map((item) => {
                const itemType = item.media_type === "tv" ? "tv" : "movie";
                const href = getMediaHref(item, itemType);
                const title = getMediaTitle(item);
                const year = getMediaYear(item);
                const genre = getPrimaryGenreLabel(item, itemType);
                const posterUrl = item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : null;
                const originLabel =
                  item.original_language === "ja" ? "Anime" : "Western";

                return (
                  <Link
                    key={`${itemType}-${item.id}`}
                    href={href}
                    className="group"
                  >
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

                      {item.vote_average ? (
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold">
                          <StarIcon className="h-3 w-3 fill-red-500 text-red-500" />
                          {item.vote_average.toFixed(1)}
                        </div>
                      ) : null}

                      <div className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                        {itemType === "tv" ? "Series" : "Movie"}
                      </div>
                    </div>

                    <div className="mt-2 px-0.5">
                      <h3 className="text-sm font-semibold leading-tight line-clamp-1 group-hover:text-red-400 transition-colors">
                        {title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            item.original_language === "ja"
                              ? "bg-red-500/15 text-red-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {originLabel}
                        </span>
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
              pathname="/anime"
              query={{
                format: query.format !== "all" ? query.format : undefined,
                origin: query.origin !== "all" ? query.origin : undefined,
                sort: query.sort !== "default" ? query.sort : undefined,
                year: query.year || undefined,
                search: searchTerm || undefined,
              }}
              totalPages={data.total_pages}
            />
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-white">
              {searchTerm
                ? `No animation matches “${searchTerm}”`
                : "No animated titles match these filters"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
              {searchTerm
                ? "Try a shorter title, or clear the search to browse all anime and animation."
                : "Try switching the format or origin filter, or clear the year."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import MediaRow from "@/components/shared/MediaRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFeedSection, getLatestSection, getMediaHref, getSectionTitle } from "@/utils/catalog";
import { InfoIcon, PlayIcon, StarIcon } from "lucide-react";

export default async function HomePage() {
  const [trendingData, popularMoviesData, topRatedTVData, latestTVData, latestMovieData] =
    await Promise.all([
      getFeedSection({ mediaType: "movie", section: "trending" }),
      getFeedSection({ mediaType: "movie", section: "popular" }),
      getFeedSection({ mediaType: "tv", section: "top-rated" }),
      getLatestSection({ mediaType: "tvshows", page: 1 }),
      getLatestSection({ mediaType: "movies", page: 1 }),
    ]);

  const trendingAll = trendingData.results;
  const popularMovies = popularMoviesData.results;
  const topRatedTV = topRatedTVData.results;
  const latestTV = latestTVData.results;
  const latestMovies = latestMovieData.results;
  const featured = trendingAll[0];

  const featuredBackdrop = featured?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${featured.backdrop_path}`
    : null;
  const featuredYear = (
    featured?.release_date ||
    featured?.first_air_date ||
    ""
  ).slice(0, 4);
  const featuredHref = featured ? getMediaHref(featured) : "#";
  const featuredType = featured?.media_type === "tv" ? "TV Series" : "Movie";

  return (
    <div className="min-h-screen bg-background pt-16">
      {featured ? (
        <section className="relative h-120 overflow-hidden md:h-135">
          {featuredBackdrop ? (
            <Image
              src={featuredBackdrop}
              alt={featured.title || featured.name || "Featured title"}
              fill
              className="object-cover object-top"
              priority
              sizes="100vw"
            />
          ) : null}

          <div className="hero-gradient absolute inset-0 z-10" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-40 bg-linear-to-t from-background to-transparent" />

          <div className="absolute inset-0 z-20 flex items-end pb-16 md:pb-20">
            <div className="mx-auto w-full max-w-7xl px-6">
              <h1 className="mb-3 text-4xl font-black leading-none tracking-tight uppercase md:text-5xl lg:text-6xl">
                {featured.name || featured.title}
              </h1>

              <div className="mb-3 flex flex-wrap items-center gap-3">
                {featuredYear ? (
                  <span className="text-sm font-medium text-muted-foreground">
                    {featuredYear}
                  </span>
                ) : null}
                {featured.vote_average ? (
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold">
                      {featured.vote_average.toFixed(1)}
                    </span>
                  </div>
                ) : null}
                <Badge variant="outline" className="text-xs">
                  {featuredType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getSectionTitle("trending")}
                </Badge>
              </div>

              <p className="mb-5 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                {featured.overview}
              </p>

              <div className="flex items-center gap-3">
                <Link href={featuredHref}>
                  <Button size="lg" className="gap-2 px-6 font-semibold">
                    <PlayIcon className="h-4 w-4" fill="currentColor" />
                    Play
                  </Button>
                </Link>
                <Link href={featuredHref}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 px-6 font-semibold"
                  >
                    <InfoIcon className="h-4 w-4" />
                    More Info
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-8">
        <MediaRow
          title="Trending Now"
          items={trendingAll}
          seeAllHref="/discover/movie/trending"
        />

        <MediaRow
          title="Popular Movies"
          items={popularMovies}
          mediaType="movie"
          seeAllHref="/discover/movie/popular"
        />

        <MediaRow
          title="Top Rated TV Series"
          items={topRatedTV}
          mediaType="tv"
          seeAllHref="/discover/tv/top-rated"
        />

        <MediaRow
          title="Latest Movies"
          items={latestMovies}
          mediaType="movie"
          seeAllHref="/discover/movie/latest"
        />

        <MediaRow
          title="Latest TV Shows"
          items={latestTV}
          mediaType="tv"
          seeAllHref="/discover/tv/latest"
        />
      </div>
    </div>
  );
}

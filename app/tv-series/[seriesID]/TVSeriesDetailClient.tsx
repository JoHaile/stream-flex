"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import EpisodeList from "@/components/shared/EpisodeList";
import type { TVEpisode, TVSeriesDetails, TMDBReview, TMDBWatchProviderResult, TMDBImageAsset, TMDBKeyword } from "@/utils/tmdb";
import { ChevronLeft, ChevronRight, StarIcon, TrendingUp, Calendar } from "lucide-react";

interface TVSeriesDetailClientProps {
  initialEpisodes: TVEpisode[];
  initialSeason: number;
  seriesData: TVSeriesDetails;
  seriesId: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function tmdbImage(path: string | null | undefined, size = "original") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";
  return dateFormatter.format(date);
}

function formatRuntime(runtime: number | null | undefined) {
  if (!runtime || runtime <= 0) return "Runtime unavailable";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatNumber(value: number | null | undefined) {
  if (!value) return "N/A";
  if (value >= 10000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return value.toFixed(1);
}

function getContentRating(series: TVSeriesDetails, region = "US") {
  return (
    series.content_ratings?.results?.find(
      (entry) => entry.iso_3166_1 === region,
    )?.rating ?? null
  );
}

function pickTrailer(series: TVSeriesDetails) {
  const videos = series.videos?.results ?? [];
  return (
    videos.find(
      (video) => video.site === "YouTube" && video.type === "Trailer" && video.official,
    ) ??
    videos.find((video) => video.site === "YouTube" && video.type === "Trailer") ??
    videos.find((video) => video.site === "YouTube")
  );
}

function pickLogo(series: TVSeriesDetails) {
  const logos = series.images?.logos ?? [];
  return (
    logos.find((logo) => logo.iso_639_1 === "en") ??
    logos.find((logo) => logo.iso_639_1 === null) ??
    logos[0]
  );
}

function getRelatedTitles(series: TVSeriesDetails) {
  const items = [
    ...(series.recommendations?.results ?? []),
    ...(series.similar?.results ?? []),
  ];
  const seen = new Set<number>();
  return items.filter((item) => {
    if (!item.poster_path || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getEpisodeEmbedUrl(seriesId: string, season: number, episode: number) {
  return `https://vsembed.ru/embed/tv/${encodeURIComponent(seriesId)}/${season}/${episode}?autoplay=1&muted=1`;
}

function getShowYearLabel(series: TVSeriesDetails) {
  const firstYear = series.first_air_date?.slice(0, 4);
  const lastYear = series.last_air_date?.slice(0, 4);
  if (!firstYear) return "Unknown";
  if (series.status === "Ended" && lastYear && firstYear !== lastYear) {
    return `${firstYear} - ${lastYear}`;
  }
  if (series.status !== "Ended" && lastYear) {
    return `${firstYear} - ${lastYear === firstYear ? "Present" : lastYear}`;
  }
  return firstYear;
}

function getUsProviders(
  data: Record<string, TMDBWatchProviderResult> | undefined,
) {
  return data?.US ?? null;
}

function ReviewCard({ review }: { review: TMDBReview }) {
  const avatar = review.author_details?.avatar_path;
  const avatarUrl = avatar
    ? avatar.startsWith("/")
      ? `https://image.tmdb.org/t/p/w45${avatar}`
      : avatar
    : null;
  const rating = review.author_details?.rating ?? null;
  const cleanContent = review.content.replace(/<\/?[^>]+(>|$)/g, "");

  return (
    <div className="flex-shrink-0 w-[340px] rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-zinc-700">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={review.author}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-400">
              {review.author[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {review.author_details?.name || review.author}
          </p>
          <p className="text-xs text-zinc-500">
            {formatDate(review.created_at)}
          </p>
        </div>
        {rating !== null ? (
          <div className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs font-semibold">
            <StarIcon className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            {rating.toFixed(1)}
          </div>
        ) : null}
      </div>
      <p className="line-clamp-4 text-xs leading-relaxed text-zinc-400">
        {cleanContent}
      </p>
      <a
        href={review.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 transition"
      >
        Read full review
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      </a>
    </div>
  );
}

export default function TVSeriesDetailClient({
  initialEpisodes,
  initialSeason,
  seriesData,
  seriesId,
}: TVSeriesDetailClientProps) {
  const [currentEpisode, setCurrentEpisode] = useState({
    episode: initialEpisodes[0]?.episode_number ?? 1,
    season: initialSeason,
  });
  const [currentEpisodeData, setCurrentEpisodeData] = useState<TVEpisode | null>(
    initialEpisodes[0] ?? null,
  );
  const [showPlayer, setShowPlayer] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const relatedRowRef = useRef<HTMLDivElement>(null);
  const stillsRowRef = useRef<HTMLDivElement>(null);
  const reviewsRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const amount = 600;
    ref.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const scrollRelated = (direction: "left" | "right") => {
    if (!relatedRowRef.current) return;
    const amount = 600;
    relatedRowRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const handleEpisodeSelect = useCallback(
    (seasonNum: number, episodeNum: number, episode?: TVEpisode) => {
      setCurrentEpisode({ season: seasonNum, episode: episodeNum });
      if (episode) setCurrentEpisodeData(episode);
      setShowPlayer(true);
    },
    [],
  );

  const heroBackdrop = tmdbImage(seriesData.backdrop_path, "w1280");
  const logo = pickLogo(seriesData);
  const trailer = pickTrailer(seriesData);
  const relatedTitles = getRelatedTitles(seriesData).slice(0, 12);
  const cast = [...(seriesData.credits?.cast ?? [])]
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .slice(0, 10);
  const creators = seriesData.created_by.slice(0, 3);
  const showYears = getShowYearLabel(seriesData);
  const contentRating = getContentRating(seriesData);
  const runtime =
    currentEpisodeData?.runtime ?? seriesData.episode_run_time?.[0] ?? null;
  const matchScore = seriesData.vote_average
    ? Math.round(seriesData.vote_average * 10)
    : null;

  const backdrops = (seriesData.images?.backdrops ?? []).slice(0, 12);
  const posters = (seriesData.images?.posters ?? []).slice(0, 8);
  const reviews = (seriesData.reviews?.results ?? []).slice(0, 10);
  const usProviders = getUsProviders(seriesData["watch/providers"]?.results);
  const keywords = (seriesData.keywords?.results ?? []) as TMDBKeyword[];
  const imdbId = seriesData.external_ids?.imdb_id;

  const hasGallery = backdrops.length > 0 || posters.length > 0;
  const hasReviews = reviews.length > 0;
  const hasProviders = usProviders && (usProviders.flatrate?.length || usProviders.rent?.length || usProviders.buy?.length);
  const hasKeywords = keywords.length > 0;
  const hasProduction = seriesData.production_companies.length > 0 || seriesData.networks.length > 0 || seriesData.production_countries.length > 0 || seriesData.spoken_languages.length > 0;

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      <section className="relative h-[80vh] min-h-[500px] w-full overflow-hidden">
        {heroBackdrop ? (
          <Image
            src={heroBackdrop}
            alt={seriesData.name}
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-16 md:px-12 lg:px-16">
          <div className="mx-auto max-w-7xl">
            {logo?.file_path ? (
              <div className="relative mb-4 h-20 w-full max-w-[400px]">
                <Image
                  src={tmdbImage(logo.file_path, "w500") ?? ""}
                  alt={`${seriesData.name} logo`}
                  fill
                  className="object-contain object-left"
                  sizes="400px"
                />
              </div>
            ) : (
              <h1 className="mb-3 text-4xl font-black tracking-tight md:text-5xl lg:text-7xl">
                {seriesData.name}
              </h1>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              {matchScore !== null ? (
                <span className="font-semibold text-green-400">
                  {matchScore}% Match
                </span>
              ) : null}
              {showYears ? (
                <span className="text-white/70">{showYears}</span>
              ) : null}
              {contentRating ? (
                <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs font-medium text-white/80">
                  {contentRating}
                </span>
              ) : null}
              <span className="text-white/70">
                {seriesData.number_of_seasons}{" "}
                {seriesData.number_of_seasons === 1 ? "Season" : "Seasons"}
              </span>
              {seriesData.episode_run_time?.[0] ? (
                <span className="text-white/70">
                  {formatRuntime(seriesData.episode_run_time[0])}
                </span>
              ) : null}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {seriesData.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre.id}
                  className="rounded bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/90"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="mb-6 max-w-xl text-sm leading-relaxed text-white/65 line-clamp-3 md:text-base">
              {seriesData.overview || "Story details are not available for this series yet."}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPlayer(true)}
                className="inline-flex items-center gap-2 rounded bg-white px-8 py-2.5 text-sm font-bold text-black hover:bg-white/90 transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {currentEpisodeData?.name ? "Resume" : "Play"}
              </button>

              {trailer ? (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex items-center gap-2 rounded bg-white/20 px-8 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition backdrop-blur-sm"
                >
                  Trailer
                </button>
              ) : null}
            </div>

            {cast.length ? (
              <div className="mt-8 flex flex-wrap gap-1 text-xs text-white/50">
                <span className="font-semibold text-white/70">Cast: </span>
                {cast
                  .slice(0, 6)
                  .map((m) => m.name)
                  .join(", ")}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-16">
        {showPlayer ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPlayer(false)}
          >
            <div className="relative w-full max-w-5xl mx-4">
              <button
                onClick={() => setShowPlayer(false)}
                className="absolute -top-10 right-0 text-sm font-medium text-zinc-400 hover:text-white transition"
              >
                Close
              </button>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-2xl">
                <iframe
                  src={getEpisodeEmbedUrl(
                    seriesId,
                    currentEpisode.season,
                    currentEpisode.episode,
                  )}
                  title={seriesData.name || "TV series player"}
                  className="absolute inset-0 h-full w-full border-none"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-medium text-zinc-400">Now Playing</p>
                  <p className="text-sm font-semibold text-white">
                    {currentEpisodeData?.name
                      ? `S${currentEpisode.season}:E${currentEpisode.episode} · ${currentEpisodeData.name}`
                      : `${seriesData.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  {runtime ? <span>{formatRuntime(runtime)}</span> : null}
                  {currentEpisodeData?.air_date ? (
                    <span>{formatDate(currentEpisodeData.air_date)}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {cast.length ? (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-white">Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {cast.map((member) => {
                const profileUrl = tmdbImage(member.profile_path, "w185");
                return (
                  <div key={member.id} className="flex-shrink-0 w-24 text-center">
                    <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full bg-zinc-800">
                      {profileUrl ? (
                        <Image
                          src={profileUrl}
                          alt={member.name}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-500">
                          {member.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                        </div>
                      )}
                    </div>
                    <p className="truncate text-xs font-medium text-white/80">
                      {member.name}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {member.character || ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">Episodes</h2>
          <EpisodeList
            currentEpisode={currentEpisode}
            initialEpisodes={initialEpisodes}
            initialSeason={initialSeason}
            onEpisodeSelect={handleEpisodeSelect}
            seasons={seriesData.seasons || []}
            seriesId={seriesId}
          />
        </section>

        {seriesData.overview ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <h2 className="mb-4 text-xl font-bold text-white">About {seriesData.name}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
              {seriesData.overview}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3">
                <TrendingUp className="mb-1 h-4 w-4 text-red-400" />
                <p className="text-[11px] font-medium text-zinc-500">Popularity</p>
                <p className="text-sm font-semibold text-white">{formatNumber(seriesData.popularity)}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3">
                <Calendar className="mb-1 h-4 w-4 text-blue-400" />
                <p className="text-[11px] font-medium text-zinc-500">First Aired</p>
                <p className="text-sm font-semibold text-white">{formatDate(seriesData.first_air_date)}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3">
                <Calendar className="mb-1 h-4 w-4 text-purple-400" />
                <p className="text-[11px] font-medium text-zinc-500">Status</p>
                <p className="text-sm font-semibold text-white">{seriesData.status}</p>
              </div>
              {seriesData.genres.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3 col-span-2 sm:col-span-1 lg:col-span-2">
                  <p className="text-[11px] font-medium text-zinc-500 mb-1">Genres</p>
                  <p className="text-xs leading-relaxed text-white/80">
                    {seriesData.genres.map((g) => g.name).join(", ")}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-zinc-400">
              {creators.length ? (
                <div>
                  <span className="font-semibold text-zinc-300">Created by: </span>
                  {creators.map((c) => c.name).join(", ")}
                </div>
              ) : null}
              {seriesData.genres.length ? (
                <div>
                  <span className="font-semibold text-zinc-300">Genres: </span>
                  {seriesData.genres.map((g) => g.name).join(", ")}
                </div>
              ) : null}
              {seriesData.networks.length ? (
                <div>
                  <span className="font-semibold text-zinc-300">Network: </span>
                  {seriesData.networks.map((n) => n.name).join(", ")}
                </div>
              ) : null}
              {imdbId ? (
                <div>
                  <a
                    href={`https://www.imdb.com/title/${imdbId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded bg-yellow-500/15 px-3 py-1 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/25 transition ring-1 ring-yellow-500/30"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 7.5v9H18v-9h-1.5zM12 7.5v9h1.5v-9H12zm-3 9V9.75L6 12.75V9H4.5v9H6l3-3.75V16.5H9v-6.75L12 12.75V9H9v7.5zM3 6v12h18V6H3z" />
                    </svg>
                    IMDb
                  </a>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasGallery ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <h2 className="mb-4 text-xl font-bold text-white">Gallery</h2>
            {backdrops.length ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Stills</p>
                <div className="relative">
                  <div
                    ref={stillsRowRef}
                    className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar"
                  >
                    {backdrops.map((img, i) => {
                      const url = tmdbImage(img.file_path, "w780");
                      if (!url) return null;
                      return (
                        <div
                          key={i}
                          className="relative aspect-video h-28 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800"
                        >
                          <Image
                            src={url}
                            alt={`${seriesData.name} still`}
                            fill
                            className="object-cover"
                            sizes="180px"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {backdrops.length > 3 ? (
                    <>
                      <button
                        onClick={() => scrollRow(stillsRowRef, "left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-300 hover:bg-black/80 hover:text-white transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => scrollRow(stillsRowRef, "right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-300 hover:bg-black/80 hover:text-white transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
            {posters.length ? (
              <div className="mt-6">
                <p className="mb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Posters &amp; Artwork</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {posters.slice(0, 8).map((img, i) => {
                    const url = tmdbImage(img.file_path, i === 0 ? "w780" : "w342");
                    if (!url) return null;
                    const isFeatured = i === 0;
                    const isBanner = i === 6 || i === 7;
                    return (
                      <div
                        key={i}
                        className={`relative overflow-hidden rounded-md bg-zinc-800 group ${
                          isFeatured
                            ? "col-span-2 row-span-2 md:col-span-2 md:row-span-2"
                            : isBanner && posters.length > 6
                              ? "col-span-2 sm:col-span-1 md:col-span-1"
                              : ""
                        }`}
                      >
                        <div className={isFeatured ? "aspect-[4/5] md:aspect-auto md:absolute md:inset-0" : "aspect-[2/3]"}>
                          <Image
                            src={url}
                            alt={`${seriesData.name} poster`}
                            fill
                            className="object-cover transition duration-300 group-hover:scale-105"
                            sizes={
                              isFeatured
                                ? "(max-width: 768px) 100vw, 50vw"
                                : "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {hasReviews ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                Reviews <span className="text-sm font-normal text-zinc-500">({reviews.length})</span>
              </h2>
              {reviews.length > 2 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollRow(reviewsRowRef, "left")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => scrollRow(reviewsRowRef, "right")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
            <div
              ref={reviewsRowRef}
              className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar"
            >
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        ) : null}

        {hasProviders ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <h2 className="mb-4 text-xl font-bold text-white">Where to Watch</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {usProviders!.flatrate?.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2.5 text-xs font-semibold text-green-400 uppercase tracking-wider">Stream</p>
                  <div className="flex flex-wrap gap-2">
                    {usProviders!.flatrate.map((p) => (
                      <div
                        key={p.provider_id}
                        className="flex items-center gap-2 rounded bg-zinc-800/80 px-2.5 py-1.5"
                      >
                        {p.logo_path ? (
                          <Image
                            src={tmdbImage(p.logo_path, "w45") ?? ""}
                            alt={p.provider_name}
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        ) : null}
                        <span className="text-xs font-medium text-white/80">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {usProviders!.rent?.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">Rent</p>
                  <div className="flex flex-wrap gap-2">
                    {usProviders!.rent.map((p) => (
                      <div
                        key={p.provider_id}
                        className="flex items-center gap-2 rounded bg-zinc-800/80 px-2.5 py-1.5"
                      >
                        {p.logo_path ? (
                          <Image
                            src={tmdbImage(p.logo_path, "w45") ?? ""}
                            alt={p.provider_name}
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        ) : null}
                        <span className="text-xs font-medium text-white/80">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {usProviders!.buy?.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2.5 text-xs font-semibold text-yellow-400 uppercase tracking-wider">Buy</p>
                  <div className="flex flex-wrap gap-2">
                    {usProviders!.buy.map((p) => (
                      <div
                        key={p.provider_id}
                        className="flex items-center gap-2 rounded bg-zinc-800/80 px-2.5 py-1.5"
                      >
                        {p.logo_path ? (
                          <Image
                            src={tmdbImage(p.logo_path, "w45") ?? ""}
                            alt={p.provider_name}
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        ) : null}
                        <span className="text-xs font-medium text-white/80">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasProduction ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <h2 className="mb-4 text-xl font-bold text-white">Production</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {seriesData.production_companies.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Studios</p>
                  <div className="flex flex-col gap-1.5">
                    {seriesData.production_companies.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        {c.logo_path ? (
                          <div className="relative h-6 w-8 flex-shrink-0">
                            <Image
                              src={tmdbImage(c.logo_path, "w92") ?? ""}
                              alt={c.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                        ) : null}
                        <span className="text-sm text-white/80">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {seriesData.networks.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Networks</p>
                  <div className="flex flex-wrap gap-2">
                    {seriesData.networks.map((n) => (
                      <div key={n.id} className="flex items-center gap-2 rounded bg-zinc-800/80 px-2.5 py-1.5">
                        {n.logo_path ? (
                          <Image
                            src={tmdbImage(n.logo_path, "w45") ?? ""}
                            alt={n.name}
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        ) : null}
                        <span className="text-xs font-medium text-white/80">{n.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {seriesData.production_countries.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Countries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {seriesData.production_countries.map((c) => (
                      <span
                        key={c.iso_3166_1}
                        className="rounded bg-zinc-800/80 px-2 py-1 text-xs text-white/70"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {seriesData.spoken_languages.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {seriesData.spoken_languages.map((lang) => (
                      <span
                        key={lang.iso_639_1}
                        className="rounded bg-zinc-800/80 px-2 py-1 text-xs text-white/70"
                      >
                        {lang.english_name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasKeywords ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <h2 className="mb-4 text-xl font-bold text-white">Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <span
                  key={kw.id}
                  className="rounded-full bg-zinc-800/80 px-3 py-1 text-xs font-medium text-zinc-300 ring-1 ring-zinc-700/50"
                >
                  {kw.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {relatedTitles.length ? (
          <section className="border-t border-zinc-800 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">More Like This</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRelated("left")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollRelated("right")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={relatedRowRef}
              className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar"
            >
              {relatedTitles.map((item) => {
                const poster = tmdbImage(item.poster_path, "w342");
                return (
                  <Link
                    key={item.id}
                    href={`/tv-series/${item.id}`}
                    className="group flex-shrink-0 w-[150px]"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-zinc-800">
                      {poster ? (
                        <Image
                          src={poster}
                          alt={item.name}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-110 group-hover:opacity-60"
                          sizes="150px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-500">
                          {item.name}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <div className="h-12 w-12 rounded-full border-2 border-white/80 flex items-center justify-center">
                          <svg
                            className="ml-0.5 h-5 w-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      {item.vote_average ? (
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold">
                          <StarIcon className="h-3 w-3 fill-red-500 text-red-500" />
                          {item.vote_average.toFixed(1)}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {item.first_air_date?.slice(0, 4) || "TBA"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      {trailerOpen && trailer ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setTrailerOpen(false)}
        >
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute -top-10 right-0 text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              Close
            </button>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                title={`${seriesData.name} trailer`}
                className="absolute inset-0 h-full w-full border-none"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

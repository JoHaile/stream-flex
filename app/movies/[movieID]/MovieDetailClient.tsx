"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  StarIcon,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Landmark,
  Calendar,
} from "lucide-react";
import type {
  MovieDetails,
  TMDBMovieCard,
  TMDBReview,
  TMDBWatchProviderResult,
  TMDBKeyword,
} from "@/utils/getMovies";
import { getMovieEmbedUrl } from "@/utils/embed";
import MediaPlayer from "@/components/shared/MediaPlayer";
import MediaGallery from "@/components/shared/MediaGallery";

interface MovieDetailClientProps {
  movie: MovieDetails;
  movieId: string;
  certification: string | null;
  relatedTitles: TMDBMovieCard[];
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

function formatRuntime(runtime: number | null | undefined) {
  if (!runtime || runtime <= 0) return "N/A";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";
  return dateFormatter.format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (!value) return "N/A";
  if (value >= 10000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return value.toFixed(1);
}

function getCrew(movie: MovieDetails) {
  const crew = movie.credits?.crew ?? [];
  const directors = Array.from(
    new Set(
      crew
        .filter((member) => member.job === "Director")
        .map((member) => member.name),
    ),
  );
  const writers = Array.from(
    new Set(
      crew
        .filter((member) =>
          ["Screenplay", "Writer", "Story"].includes(member.job),
        )
        .map((member) => member.name),
    ),
  );
  return { directors, writers };
}

function getEmbedUrl(id: string) {
  return getMovieEmbedUrl(id);
}

function getUsProviders(
  data: Record<string, TMDBWatchProviderResult> | undefined,
) {
  return data?.US ?? null;
}

function ReviewCard({ review }: { review: TMDBReview }) {
  const avatar = review.author_details?.avatar_path;
  // TMDB returns an absolute Gravatar URL for authors without a TMDB account.
  // Only serve avatars hosted by TMDB; anything else falls back to initials.
  const avatarUrl = avatar?.startsWith("/")
    ? `https://image.tmdb.org/t/p/w45${avatar}`
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
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export default function MovieDetailClient({
  movie,
  movieId,
  certification,
  relatedTitles,
}: MovieDetailClientProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const relatedRowRef = useRef<HTMLDivElement>(null);
  const reviewsRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const amount = 600;
    ref.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const heroBackdrop = tmdbImage(movie.backdrop_path, "w1280");
  const logo = movie.images?.logos?.find(
    (l) => l.iso_639_1 === "en",
  ) ?? movie.images?.logos?.[0];
  const trailer = (() => {
    const videos = movie.videos?.results ?? [];
    return (
      videos.find(
        (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
      ) ??
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      videos.find((v) => v.site === "YouTube")
    );
  })();
  const crew = getCrew(movie);
  const matchScore = movie.vote_average
    ? Math.round(movie.vote_average * 10)
    : null;
  const cast = [...(movie.credits?.cast ?? [])]
    .sort((left, right) => left.order - right.order)
    .slice(0, 10);

  const backdrops = (movie.images?.backdrops ?? []).slice(0, 12);
  const posters = (movie.images?.posters ?? []).slice(0, 8);
  const reviews = (movie.reviews?.results ?? []).slice(0, 10);
  const usProviders = getUsProviders(movie["watch/providers"]?.results);
  const budgetFormatted = formatCurrency(movie.budget);
  const revenueFormatted = formatCurrency(movie.revenue);
  const keywords = (movie.keywords?.keywords ?? movie.keywords?.results ?? []) as TMDBKeyword[];

  const hasReviews = reviews.length > 0;
  const hasProviders = usProviders && (usProviders.flatrate?.length || usProviders.rent?.length || usProviders.buy?.length);
  const hasKeywords = keywords.length > 0;
  const hasProduction = movie.production_companies.length > 0 || movie.production_countries.length > 0 || movie.spoken_languages.length > 0;

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      <section className="relative h-[80vh] min-h-[500px] w-full overflow-hidden">
        {heroBackdrop ? (
          <Image
            src={heroBackdrop}
            alt={movie.title}
            fill
            preload
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
                  alt={`${movie.title} logo`}
                  fill
                  className="object-contain object-left"
                  sizes="400px"
                />
              </div>
            ) : (
              <h1 className="mb-3 text-4xl font-black tracking-tight md:text-5xl lg:text-7xl">
                {movie.title}
              </h1>
            )}

            {movie.tagline ? (
              <p className="mb-2 max-w-xl text-sm italic text-white/50">
                {movie.tagline}
              </p>
            ) : null}

            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              {matchScore !== null ? (
                <span className="font-semibold text-green-400">
                  {matchScore}% Match
                </span>
              ) : null}
              {movie.release_date?.slice(0, 4) ? (
                <span className="text-white/70">
                  {movie.release_date.slice(0, 4)}
                </span>
              ) : null}
              {certification ? (
                <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs font-medium text-white/80">
                  {certification}
                </span>
              ) : null}
              <span className="text-white/70">
                {formatRuntime(movie.runtime)}
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {movie.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre.id}
                  className="rounded bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/90"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="mb-6 max-w-xl text-sm leading-relaxed text-white/65 line-clamp-3 md:text-base">
              {movie.overview || "Story details are not available for this title yet."}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPlayer(true)}
                className="inline-flex items-center gap-2 rounded bg-white px-8 py-2.5 text-sm font-bold text-black hover:bg-white/90 transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
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
        <MediaPlayer
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
          title="Now Playing"
          info={
            <div className="flex w-full items-center justify-between">
              <p className="text-sm font-semibold text-white">{movie.title}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>{formatRuntime(movie.runtime)}</span>
                {movie.release_date ? (
                  <span>{formatDate(movie.release_date)}</span>
                ) : null}
              </div>
            </div>
          }
        >
          <iframe
            src={getEmbedUrl(movieId)}
            title={movie.title || "Movie player"}
            className="absolute inset-0 h-full w-full border-none"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </MediaPlayer>

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

        {movie.overview ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <h2 className="mb-4 text-xl font-bold text-white">
              About {movie.title}
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
              {movie.overview}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3">
                <TrendingUp className="mb-1 h-4 w-4 text-red-400" />
                <p className="text-[11px] font-medium text-zinc-500">Popularity</p>
                <p className="text-sm font-semibold text-white">{formatNumber(movie.popularity)}</p>
              </div>
              {budgetFormatted ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3">
                  <DollarSign className="mb-1 h-4 w-4 text-green-400" />
                  <p className="text-[11px] font-medium text-zinc-500">Budget</p>
                  <p className="text-sm font-semibold text-white">{budgetFormatted}</p>
                </div>
              ) : null}
              {revenueFormatted ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3">
                  <Landmark className="mb-1 h-4 w-4 text-yellow-400" />
                  <p className="text-[11px] font-medium text-zinc-500">Revenue</p>
                  <p className="text-sm font-semibold text-white">{revenueFormatted}</p>
                </div>
              ) : null}
              <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3">
                <Calendar className="mb-1 h-4 w-4 text-blue-400" />
                <p className="text-[11px] font-medium text-zinc-500">Release</p>
                <p className="text-sm font-semibold text-white">{formatDate(movie.release_date)}</p>
              </div>
              {movie.genres.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-3 col-span-2 sm:col-span-1 lg:col-span-2">
                  <p className="text-[11px] font-medium text-zinc-500 mb-1">Genres</p>
                  <p className="text-xs leading-relaxed text-white/80">
                    {movie.genres.map((g) => g.name).join(", ")}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-zinc-400">
              {crew.directors.length ? (
                <div>
                  <span className="font-semibold text-zinc-300">Director: </span>
                  {crew.directors.join(", ")}
                </div>
              ) : null}
              {crew.writers.length ? (
                <div>
                  <span className="font-semibold text-zinc-300">Writer: </span>
                  {crew.writers.join(", ")}
                </div>
              ) : null}
              {movie.imdb_id ? (
                <div>
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
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

        <MediaGallery
          title={movie.title}
          backdrops={backdrops}
          posters={posters}
        />

        {relatedTitles.length ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">More Like This</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRow(relatedRowRef, "left")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollRow(relatedRowRef, "right")}
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
                    href={`/movies/${item.id}`}
                    className="group flex-shrink-0 w-[150px]"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-zinc-800">
                      {poster ? (
                        <Image
                          src={poster}
                          alt={item.title}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-110 group-hover:opacity-60"
                          sizes="150px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-500">
                          {item.title}
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
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {item.release_date?.slice(0, 4) || "TBA"}
                    </p>
                  </Link>
                );
              })}
            </div>
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
              {movie.production_companies.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Studios</p>
                  <div className="flex flex-col gap-1.5">
                    {movie.production_companies.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        {c.logo_path ? (
                          <div className="relative h-6 w-8 flex-shrink-0">
                            <Image
                              src={tmdbImage(c.logo_path, "w92") ?? ""}
                              alt={c.name}
                              fill
                              sizes="32px"
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
              {movie.production_countries.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Countries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.production_countries.map((c) => (
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
              {movie.spoken_languages.length ? (
                <div className="rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800 p-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.spoken_languages.map((lang) => (
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

      </main>

      <MediaPlayer
        isOpen={trailerOpen && !!trailer}
        onClose={() => setTrailerOpen(false)}
        title="Trailer"
      >
        {trailer ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
            title={`${movie.title} trailer`}
            className="absolute inset-0 h-full w-full border-none"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        ) : null}
      </MediaPlayer>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  StarIcon,
} from "lucide-react";
import type {
  MovieDetails,
  TMDBMovieCard,
} from "@/utils/getMovies";

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
  if (!runtime || runtime <= 0) return "Runtime unavailable";
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
  return `https://vsembed.ru/embed/movie/${encodeURIComponent(id)}/?autoplay=1&muted=1`;
}

export default function MovieDetailClient({
  movie,
  movieId,
  certification,
  relatedTitles,
}: MovieDetailClientProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const relatedRowRef = useRef<HTMLDivElement>(null);

  const scrollRelated = (direction: "left" | "right") => {
    if (!relatedRowRef.current) return;
    const amount = 600;
    relatedRowRef.current.scrollBy({
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

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative h-[80vh] min-h-[500px] w-full overflow-hidden">
        {heroBackdrop ? (
          <Image
            src={heroBackdrop}
            alt={movie.title}
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
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded bg-white/20 px-8 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition backdrop-blur-sm"
                >
                  Trailer
                </a>
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
          <section className="-mt-20 relative z-10 mb-10 overflow-hidden rounded-lg bg-black shadow-2xl">
            <div className="relative aspect-video w-full">
              <iframe
                src={getEmbedUrl(movieId)}
                title={movie.title || "Movie player"}
                className="absolute inset-0 h-full w-full border-none"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between bg-zinc-900 px-5 py-3">
              <div>
                <p className="text-xs font-medium text-zinc-400">Now Playing</p>
                <p className="text-sm font-semibold text-white">
                  {movie.title}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>{formatRuntime(movie.runtime)}</span>
                {movie.release_date ? (
                  <span>{formatDate(movie.release_date)}</span>
                ) : null}
              </div>
            </div>
          </section>
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

        {movie.overview ? (
          <section className="mb-10 border-t border-zinc-800 pt-8">
            <h2 className="mb-3 text-xl font-bold text-white">
              About {movie.title}
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
              {movie.overview}
            </p>
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
              {movie.genres.length ? (
                <div>
                  <span className="font-semibold text-zinc-300">Genres: </span>
                  {movie.genres.map((g) => g.name).join(", ")}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {relatedTitles.length ? (
          <section>
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
      </main>
    </div>
  );
}

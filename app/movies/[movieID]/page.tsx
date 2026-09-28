import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MovieDetailClient from "./MovieDetailClient";
import { getMovieDetails, type MovieDetails } from "@/utils/getMovies";

type Props = {
  params: Promise<{ movieID: string }>;
};

function tmdbImage(path: string | null | undefined, size = "original") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function getCertification(movie: MovieDetails, region = "US") {
  const releaseSet = movie.release_dates?.results?.find(
    (entry) => entry.iso_3166_1 === region,
  );
  return (
    releaseSet?.release_dates.find((entry) => entry.certification)?.certification
      ?? null
  );
}

function getRelatedTitles(movie: MovieDetails) {
  const items = [
    ...(movie.recommendations?.results ?? []),
    ...(movie.similar?.results ?? []),
  ];
  const seen = new Set<number>();
  return items.filter((item) => {
    if (!item.poster_path || item.id === movie.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { movieID } = await params;
  const movie = await getMovieDetails(movieID);

  if (!movie) {
    return { title: "Movie not found | StreamFlix" };
  }

  const year = movie.release_date?.slice(0, 4);
  const title = year
    ? `${movie.title} (${year}) | StreamFlix`
    : `${movie.title} | StreamFlix`;
  const description =
    movie.overview || `Watch ${movie.title} and explore cast, reviews, and details.`;
  const backdrop = tmdbImage(movie.backdrop_path, "w1280");

  return {
    title,
    description,
    openGraph: {
      description,
      images: backdrop ? [{ url: backdrop }] : undefined,
      title,
      type: "website",
    },
  };
}

export default async function Page({ params }: Props) {
  const { movieID } = await params;
  const movie = await getMovieDetails(movieID);

  if (!movie) {
    notFound();
  }

  const certification = getCertification(movie);
  const relatedTitles = getRelatedTitles(movie).slice(0, 12);

  return (
    <MovieDetailClient
      movie={movie}
      movieId={movieID}
      certification={certification}
      relatedTitles={relatedTitles}
    />
  );
}

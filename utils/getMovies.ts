"use server";

import axios, { AxiosRequestConfig } from "axios";
import { cache } from "react";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export type TMDBImageAsset = {
  file_path: string | null;
  height: number;
  width: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
};

type TMDBVideo = {
  id: string;
  key: string;
  name: string;
  official: boolean;
  published_at: string;
  site: string;
  type: string;
};

type TMDBCastMember = {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
};

type TMDBCrewMember = {
  id: number;
  name: string;
  department: string;
  job: string;
};

export type TMDBProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export type TMDBReview = {
  id: string;
  author: string;
  content: string;
  created_at: string;
  url: string;
  author_details?: {
    avatar_path: string | null;
    name: string;
    rating: number | null;
    username: string;
  };
};

export type TMDBMovieCard = {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
};

export type TMDBKeyword = {
  id: number;
  name: string;
};

export type TMDBWatchProviderResult = {
  link?: string;
  flatrate?: TMDBProvider[];
  rent?: TMDBProvider[];
  buy?: TMDBProvider[];
  ads?: TMDBProvider[];
  free?: TMDBProvider[];
};

type TMDBMovieReleaseDate = {
  certification: string;
  note: string;
  release_date: string;
  type: number;
};

export interface MovieDetails {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection:
    | {
        id: number;
        name: string;
        poster_path: string | null;
        backdrop_path: string | null;
      }
    | null;
  budget: number;
  genres: Array<{ id: number; name: string }>;
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  images?: {
    backdrops: TMDBImageAsset[];
    logos: TMDBImageAsset[];
    posters: TMDBImageAsset[];
  };
  keywords?: {
    keywords?: TMDBKeyword[];
    results?: TMDBKeyword[];
  };
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: Array<{
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }>;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  recommendations?: {
    results: TMDBMovieCard[];
  };
  release_date: string;
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: TMDBMovieReleaseDate[];
    }>;
  };
  revenue: number;
  reviews?: {
    results: TMDBReview[];
  };
  runtime: number | null;
  similar?: {
    results: TMDBMovieCard[];
  };
  spoken_languages: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  status: string;
  tagline: string | null;
  title: string;
  videos?: {
    results: TMDBVideo[];
  };
  vote_average: number;
  vote_count: number;
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  "watch/providers"?: {
    results: Record<string, TMDBWatchProviderResult>;
  };
}

export interface MovieCollectionDetails {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  parts: TMDBMovieCard[];
}

async function tmdbGet<T>(
  path: string,
  errorMessage: string,
): Promise<T | null> {
  const options: AxiosRequestConfig = {
    method: "GET",
    url: `${TMDB_BASE_URL}${path}`,
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_API_KEY}`,
    },
  };

  try {
    const response = await axios.request<T>(options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
}

export const getMovieDetails = cache(async (movieID: string) => {
  return tmdbGet<MovieDetails>(
    `/movie/${movieID}?append_to_response=videos,credits,images,release_dates,watch/providers,keywords,recommendations,similar,reviews&language=en-US&include_image_language=en,null`,
    "Failed to fetch movie details from TMDB",
  );
});

export const getMovieCollection = cache(async (collectionId: number) => {
  return tmdbGet<MovieCollectionDetails>(
    `/collection/${collectionId}?language=en-US`,
    "Failed to fetch movie collection from TMDB",
  );
});

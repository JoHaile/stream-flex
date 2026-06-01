"use server";

import axios, { AxiosRequestConfig } from "axios";
import { cache } from "react";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export type TMDBImageAsset = {
  file_path: string | null;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  width: number;
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

type TMDBProvider = {
  logo_path: string | null;
  provider_id: number;
  provider_name: string;
};

export type TMDBWatchProviderResult = {
  ads?: TMDBProvider[];
  buy?: TMDBProvider[];
  flatrate?: TMDBProvider[];
  free?: TMDBProvider[];
  link?: string;
  rent?: TMDBProvider[];
};

export type TMDBReview = {
  author: string;
  author_details?: {
    avatar_path: string | null;
    name: string;
    rating: number | null;
    username: string;
  };
  content: string;
  created_at: string;
  id: string;
  url: string;
};

type TMDBCreditPerson = {
  character?: string;
  department?: string;
  id: number;
  job?: string;
  name: string;
  order?: number;
  profile_path: string | null;
};

export type TMDBKeyword = {
  id: number;
  name: string;
};

export type TVSeriesCard = {
  backdrop_path: string | null;
  first_air_date: string;
  genre_ids?: number[];
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
};

export interface TVEpisode {
  air_date: string | null;
  episode_number: number;
  id: number;
  name: string;
  overview: string;
  runtime: number | null;
  season_number: number;
  still_path: string | null;
  vote_average: number;
}

export interface TVSeasonDetails {
  air_date: string | null;
  episodes: TVEpisode[];
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

type TMDBExternalIDs = {
  imdb_id: string | null;
};

export interface TVSeriesDetails {
  backdrop_path: string | null;
  external_ids?: TMDBExternalIDs;
  content_ratings?: {
    results: Array<{ iso_3166_1: string; rating: string }>;
  };
  created_by: Array<{
    id: number;
    name: string;
    profile_path: string | null;
  }>;
  credits?: {
    cast: TMDBCreditPerson[];
    crew: TMDBCreditPerson[];
  };
  episode_run_time: number[];
  first_air_date: string;
  genres: Array<{ id: number; name: string }>;
  homepage: string | null;
  id: number;
  images?: {
    backdrops: TMDBImageAsset[];
    logos: TMDBImageAsset[];
    posters: TMDBImageAsset[];
  };
  in_production: boolean;
  keywords?: {
    results?: TMDBKeyword[];
  };
  languages: string[];
  last_air_date: string | null;
  name: string;
  networks: Array<{
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }>;
  next_episode_to_air?: {
    air_date: string | null;
    episode_number: number;
    name: string;
    overview: string;
    season_number: number;
  } | null;
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
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
    results: TVSeriesCard[];
  };
  reviews?: {
    results: TMDBReview[];
  };
  seasons: Array<{
    air_date: string | null;
    episode_count: number;
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
  }>;
  similar?: {
    results: TVSeriesCard[];
  };
  spoken_languages: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  status: string;
  tagline: string | null;
  type: string;
  videos?: {
    results: TMDBVideo[];
  };
  vote_average: number;
  vote_count: number;
  "watch/providers"?: {
    results: Record<string, TMDBWatchProviderResult>;
  };
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

export const getTVDetails = cache(async (seriesId: string) => {
  return tmdbGet<TVSeriesDetails>(
    `/tv/${seriesId}?append_to_response=videos,credits,images,content_ratings,watch/providers,keywords,recommendations,similar,reviews,external_ids&language=en-US&include_image_language=en,null`,
    "Failed to fetch TV details from TMDB",
  );
});

export async function getTVSeasonDetails(
  seriesId: string,
  seasonNumber: number,
) {
  return tmdbGet<TVSeasonDetails>(
    `/tv/${seriesId}/season/${seasonNumber}?language=en-US`,
    "Failed to fetch TV season details from TMDB",
  );
}

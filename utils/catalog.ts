import { cache } from "react";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export type CatalogMediaType = "movie" | "tv" | "all";
export type CatalogSection = "trending" | "popular" | "top-rated" | "latest";
export type CatalogSort = "default" | "rating" | "newest" | "oldest" | "title";
export type LatestMediaType = "tvshows" | "movies" | "episodes";

export type SearchParamValue = string | string[] | undefined;
export type SearchParamsRecord = Record<string, SearchParamValue>;

export interface CatalogItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: CatalogMediaType;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  number_of_seasons?: number;
}

export interface CatalogResponse {
  page: number;
  results: CatalogItem[];
  total_pages: number;
  total_results: number;
}

export interface CatalogQueryState {
  page: number;
  genre: string;
  sort: CatalogSort;
  type: CatalogMediaType;
  year: string;
  availability: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export const movieGenreMap: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Sci-Fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie",
};

export const tvGenreMap: Record<number, string> = {
  16: "Animation",
  18: "Drama",
  35: "Comedy",
  37: "Western",
  80: "Crime",
  99: "Documentary",
  9648: "Mystery",
  10751: "Family",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const allGenreMap: Record<number, string> = {
  ...movieGenreMap,
  ...tvGenreMap,
};

function getFirstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function isValidSort(value: string | undefined): value is CatalogSort {
  return ["default", "rating", "newest", "oldest", "title"].includes(
    value ?? "",
  );
}

function isValidMediaType(value: string | undefined): value is CatalogMediaType {
  return ["movie", "tv", "all"].includes(value ?? "");
}

export function parseCatalogQuery(
  searchParams: SearchParamsRecord,
  routeMediaType: CatalogMediaType,
): CatalogQueryState {
  const requestedType = getFirstValue(searchParams.type);
  const type =
    routeMediaType === "all" && isValidMediaType(requestedType)
      ? requestedType
      : routeMediaType;

  const requestedGenre = getFirstValue(searchParams.genre);
  const requestedYear = getFirstValue(searchParams.year);
  const requestedSort = getFirstValue(searchParams.sort);
  const requestedAvailability = getFirstValue(searchParams.availability);

  return {
    genre: /^\d+$/.test(requestedGenre ?? "") ? requestedGenre ?? "" : "",
    page: parsePositiveInt(getFirstValue(searchParams.page), 1),
    sort: isValidSort(requestedSort) ? requestedSort : "default",
    type,
    year: /^\d{4}$/.test(requestedYear ?? "") ? requestedYear ?? "" : "",
    availability:
      requestedAvailability === "released" || requestedAvailability === "upcoming"
        ? requestedAvailability
        : "",
  };
}

function buildTMDBUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const response = await fetch(buildTMDBUrl(path, params), {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_API_KEY}`,
    },
    next: {
      revalidate: 1800,
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

function enrichMediaType(
  items: CatalogItem[],
  mediaType: Exclude<CatalogMediaType, "all"> | "all",
) {
  return items.map((item) => ({
    ...item,
    media_type:
      item.media_type && item.media_type !== "all" ? item.media_type : mediaType,
  }));
}

function getDiscoverSort(mediaType: Exclude<CatalogMediaType, "all">, sort: CatalogSort) {
  if (sort === "rating") {
    return "vote_average.desc";
  }

  if (sort === "newest") {
    return mediaType === "movie"
      ? "primary_release_date.desc"
      : "first_air_date.desc";
  }

  if (sort === "oldest") {
    return mediaType === "movie"
      ? "primary_release_date.asc"
      : "first_air_date.asc";
  }

  if (sort === "title") {
    return mediaType === "movie" ? "original_title.asc" : "original_name.asc";
  }

  return "popularity.desc";
}

export const getCatalogPage = cache(
  async ({
    genre,
    mediaType,
    page = 1,
    sort = "default",
    year,
    availability,
  }: {
    genre?: string;
    mediaType: Exclude<CatalogMediaType, "all">;
    page?: number;
    sort?: CatalogSort;
    year?: string;
    availability?: string;
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const availabilityFilter =
      availability === "released"
        ? mediaType === "movie"
          ? { "primary_release_date.lte": today }
          : { "air_date.lte": today }
        : availability === "upcoming"
          ? mediaType === "movie"
            ? { "primary_release_date.gte": today }
            : { "air_date.gte": today }
          : {};

    const data = await tmdbFetch<CatalogResponse>(`/discover/${mediaType}`, {
      include_adult: "false",
      include_video: mediaType === "movie" ? "false" : undefined,
      language: "en-US",
      page,
      sort_by: getDiscoverSort(mediaType, sort),
      vote_count: undefined,
      "vote_count.gte": sort === "rating" ? 200 : undefined,
      with_genres: genre || undefined,
      ...availabilityFilter,
      ...(mediaType === "movie"
        ? { primary_release_year: year || undefined }
        : { first_air_date_year: year || undefined }),
    });

    return {
      ...data,
      results: enrichMediaType(data.results, mediaType),
      total_pages: Math.min(data.total_pages, 500),
    };
  },
);

function getSectionPath(
  mediaType: CatalogMediaType,
  section: CatalogSection,
): string {
  if (section === "trending") {
    return `/trending/${mediaType}/day`;
  }

  if (mediaType === "all") {
    throw new Error("The all media type only supports trending feeds");
  }

  if (section === "popular") {
    return `/${mediaType}/popular`;
  }

  return `/${mediaType}/top_rated`;
}

export const getFeedSection = cache(
  async ({
    mediaType,
    page = 1,
    section,
  }: {
    mediaType: CatalogMediaType;
    page?: number;
    section: CatalogSection;
  }) => {
    const data = await tmdbFetch<CatalogResponse>(getSectionPath(mediaType, section), {
      language: "en-US",
      page,
    });

    return {
      ...data,
      results: enrichMediaType(data.results, mediaType),
      total_pages: Math.min(data.total_pages, 500),
    };
  },
);

export interface LatestItemData {
  imdb_id?: string;
  tmdb_id?: string | number;
  title?: string;
  embed_url?: string;
  embed_url_tmdb?: string;
  quality?: string;
  time_added?: string;
}

export interface LatestResponse {
  result?: LatestItemData[];
}

function mapLatestToCatalogItem(
  item: LatestItemData,
  mediaType: CatalogMediaType,
  index: number,
): CatalogItem {
  const tmdbId = Number(item.tmdb_id);
  return {
    id: tmdbId || -(index + 1),
    title: item.title,
    name: item.title,
    poster_path: null,
    backdrop_path: null,
    overview: undefined,
    release_date: item.time_added?.slice(0, 10),
    first_air_date: item.time_added?.slice(0, 10),
    vote_average: undefined,
    media_type: mediaType === "all" ? undefined : mediaType,
  };
}

function getLatestPath(mediaType: LatestMediaType, page: number) {
  const LATEST_BASE_URL = process.env.NEXT_PUBLIC_MOVIE_DB_LATEST_URL ?? "";
  const base = LATEST_BASE_URL.replace(/\/+$/, "");
  return `${base}/${mediaType}/latest/page-${page}.json`;
}

export const getLatestSection = cache(
  async ({
    mediaType = "tvshows",
    page = 1,
  }: {
    mediaType?: LatestMediaType;
    page?: number;
  }) => {
    const url = getLatestPath(mediaType, page);

    const response = await fetch(url, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return {
        page: 1,
        results: [] as CatalogItem[],
        total_pages: 1,
        total_results: 0,
      };
    }

    const json: LatestResponse = await response.json();
    const mappedType: CatalogMediaType =
      mediaType === "movies" ? "movie" : mediaType === "tvshows" ? "tv" : "all";

    const items = (json.result ?? []).map((item, index) =>
      mapLatestToCatalogItem(item, mappedType, index),
    );

    const withPosters = await Promise.all(
      items.map(async (item) => {
        if (!item.id || item.id < 0) return item;
        try {
          const endpoint = mappedType === "movie"
            ? `/movie/${item.id}`
            : `/tv/${item.id}`;
          const data = await tmdbFetch<{ poster_path: string | null; backdrop_path: string | null; vote_average?: number }>(endpoint, { language: "en-US" });
          return {
            ...item,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            vote_average: item.vote_average ?? data.vote_average,
          };
        } catch {
          return item;
        }
      }),
    );

    const seen = new Set<number>();
    const unique = withPosters.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    return {
      page,
      results: unique,
      total_pages: 500,
      total_results: unique.length,
    };
  },
);

function getItemTitle(item: CatalogItem) {
  return item.title || item.name || "Untitled";
}

function getItemDate(item: CatalogItem) {
  return item.release_date || item.first_air_date || "";
}

function getActiveGenreMap(queryType: CatalogMediaType) {
  if (queryType === "movie") return movieGenreMap;
  if (queryType === "tv") return tvGenreMap;
  return allGenreMap;
}

function getResolvedMediaType(
  item: CatalogItem,
  fallbackType: CatalogMediaType,
): CatalogMediaType {
  if (item.media_type && item.media_type !== "all") {
    return item.media_type;
  }

  return fallbackType;
}

export function applyFeedFilters({
  items,
  query,
  routeMediaType,
}: {
  items: CatalogItem[];
  query: CatalogQueryState;
  routeMediaType: CatalogMediaType;
}) {
  const filtered = items.filter((item) => {
    const itemType = getResolvedMediaType(item, routeMediaType);

    if (routeMediaType === "all" && query.type !== "all" && itemType !== query.type) {
      return false;
    }

    if (query.genre) {
      const genreId = Number.parseInt(query.genre, 10);
      if (!item.genre_ids?.includes(genreId)) {
        return false;
      }
    }

    if (query.year) {
      const year = getItemDate(item).slice(0, 4);
      if (year !== query.year) {
        return false;
      }
    }

    return true;
  });

  if (query.sort === "default") {
    return filtered;
  }

  return [...filtered].sort((left, right) => {
    if (query.sort === "rating") {
      return (right.vote_average ?? 0) - (left.vote_average ?? 0);
    }

    if (query.sort === "newest") {
      return getItemDate(right).localeCompare(getItemDate(left));
    }

    if (query.sort === "oldest") {
      return getItemDate(left).localeCompare(getItemDate(right));
    }

    return getItemTitle(left).localeCompare(getItemTitle(right));
  });
}

export function getGenreOptions(mediaType: CatalogMediaType): SelectOption[] {
  const genreMap = getActiveGenreMap(mediaType);

  return Object.entries(genreMap)
    .map(([value, label]) => ({
      label,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getYearOptions(): SelectOption[] {
  const currentYear = new Date().getFullYear();
  const options: SelectOption[] = [];

  for (let year = currentYear; year >= 1980; year -= 1) {
    options.push({
      label: String(year),
      value: String(year),
    });
  }

  return options;
}

export function getSortOptions(
  context: "catalog" | CatalogSection,
): SelectOption[] {
  const defaultLabel =
    context === "catalog"
      ? "Most popular"
      : context === "trending"
        ? "Trending order"
        : context === "popular"
          ? "Popularity order"
          : context === "latest"
            ? "Latest order"
            : "Top rated order";

  return [
    { label: defaultLabel, value: "default" },
    { label: "Highest rated", value: "rating" },
    { label: "Newest first", value: "newest" },
    { label: "Oldest first", value: "oldest" },
    { label: "Title A-Z", value: "title" },
  ];
}

export function getMediaTypeOptions(): SelectOption[] {
  return [
    { label: "All types", value: "all" },
    { label: "Movies", value: "movie" },
    { label: "TV series", value: "tv" },
  ];
}

export function getMediaHref(item: CatalogItem, forcedType?: CatalogMediaType) {
  const mediaType =
    forcedType && forcedType !== "all"
      ? forcedType
      : item.media_type === "tv"
        ? "tv"
        : "movie";

  return mediaType === "tv" ? `/tv-series/${item.id}` : `/movies/${item.id}`;
}

export function getMediaYear(item: CatalogItem) {
  return getItemDate(item).slice(0, 4);
}

export function getMediaTitle(item: CatalogItem) {
  return getItemTitle(item);
}

export function getPrimaryGenreLabel(
  item: CatalogItem,
  fallbackType: CatalogMediaType = "movie",
) {
  const genreId = item.genre_ids?.[0];
  if (!genreId) return undefined;

  const type = getResolvedMediaType(item, fallbackType);
  const genreMap =
    type === "tv" ? tvGenreMap : type === "movie" ? movieGenreMap : allGenreMap;

  return genreMap[genreId];
}

export function getSectionTitle(section: CatalogSection) {
  if (section === "top-rated") return "Top Rated";
  if (section === "popular") return "Popular";
  if (section === "latest") return "Latest";
  return "Trending";
}

export type Availability = "all" | "released" | "upcoming";

export function getAvailabilityOptions(): SelectOption[] {
  return [
    { label: "All", value: "all" },
    { label: "Released", value: "released" },
    { label: "Upcoming", value: "upcoming" },
  ];
}

export interface SearchResultItem {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
}

export interface MultiSearchResponse {
  page: number;
  results: SearchResultItem[];
  total_pages: number;
  total_results: number;
}

export const getMultiSearch = cache(
  async ({ query, page = 1 }: { query: string; page?: number }) => {
    if (!query.trim()) return null;
    const data = await tmdbFetch<MultiSearchResponse>("/search/multi", {
      include_adult: "false",
      language: "en-US",
      page,
      query: query.trim(),
    });
    return {
      ...data,
      results: data.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      ),
    };
  },
);

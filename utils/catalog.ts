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

function emptyCatalogResponse(): CatalogResponse {
  return {
    page: 1,
    results: [] as CatalogItem[],
    total_pages: 1,
    total_results: 0,
  };
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

    let data: CatalogResponse;
    try {
      data = await tmdbFetch<CatalogResponse>(`/discover/${mediaType}`, {
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
    } catch (error) {
      console.error(`Catalog: failed to load ${mediaType}`, error);
      return emptyCatalogResponse();
    }

    return {
      ...data,
      results: enrichMediaType(data.results, mediaType),
      total_pages: Math.min(data.total_pages, 500),
    };
  },
);

export const ANIMATION_GENRE_ID = 16;

export type AnimeFormat = "all" | "movie" | "tv";
export type AnimeOrigin = "all" | "anime" | "english";

export interface AnimeQueryState {
  format: AnimeFormat;
  origin: AnimeOrigin;
  page: number;
  sort: CatalogSort;
  year: string;
}

function isValidAnimeFormat(value: string | undefined): value is AnimeFormat {
  return ["all", "movie", "tv"].includes(value ?? "");
}

function isValidAnimeOrigin(value: string | undefined): value is AnimeOrigin {
  return ["all", "anime", "english"].includes(value ?? "");
}

export function parseAnimeQuery(
  searchParams: SearchParamsRecord,
): AnimeQueryState {
  const requestedFormat = getFirstValue(searchParams.format);
  const requestedOrigin = getFirstValue(searchParams.origin);
  const requestedYear = getFirstValue(searchParams.year);
  const requestedSort = getFirstValue(searchParams.sort);

  return {
    format: isValidAnimeFormat(requestedFormat) ? requestedFormat : "all",
    origin: isValidAnimeOrigin(requestedOrigin) ? requestedOrigin : "all",
    page: parsePositiveInt(getFirstValue(searchParams.page), 1),
    sort: isValidSort(requestedSort) ? requestedSort : "default",
    year: /^\d{4}$/.test(requestedYear ?? "") ? requestedYear ?? "" : "",
  };
}

function sortCatalogItems(items: CatalogItem[], sort: CatalogSort) {
  if (sort === "default") {
    return [...items].sort(
      (left, right) => (right.popularity ?? 0) - (left.popularity ?? 0),
    );
  }

  if (sort === "rating") {
    return [...items].sort(
      (left, right) => (right.vote_average ?? 0) - (left.vote_average ?? 0),
    );
  }

  if (sort === "newest") {
    return [...items].sort((left, right) =>
      getItemDate(right).localeCompare(getItemDate(left)),
    );
  }

  if (sort === "oldest") {
    return [...items].sort((left, right) =>
      getItemDate(left).localeCompare(getItemDate(right)),
    );
  }

  return [...items].sort((left, right) =>
    getItemTitle(left).localeCompare(getItemTitle(right)),
  );
}

/**
 * Animated catalog (movies + TV series) built from the TMDB Animation genre.
 * `origin = "anime"` narrows the feed to Japanese animation, which is what
 * most people mean by anime; `origin = "english"` keeps English-language
 * (mostly Western) animation; `origin = "all"` (the default) interleaves both
 * with Japanese anime leading, so the page opens with anime instead of
 * whatever global popularity puts on top.
 */
export const getAnimeCatalogPage = cache(
  async ({
    format = "all",
    origin = "all",
    page = 1,
    sort = "default",
    year,
  }: {
    format?: AnimeFormat;
    origin?: AnimeOrigin;
    page?: number;
    sort?: CatalogSort;
    year?: string;
  }) => {
    const mediaTypes: Array<Exclude<CatalogMediaType, "all">> =
      format === "all" ? ["movie", "tv"] : [format];

    const languages: Array<"ja" | "en"> =
      origin === "anime" ? ["ja"] : origin === "english" ? ["en"] : ["ja", "en"];

    const responses = await Promise.all(
      mediaTypes.flatMap((mediaType) =>
        languages.map(async (language) => {
          try {
            return {
              data: await tmdbFetch<CatalogResponse>(
                `/discover/${mediaType}`,
                {
                  include_adult: "false",
                  include_video: "false",
                  language: "en-US",
                  page,
                  sort_by: getDiscoverSort(mediaType, sort),
                  "vote_count.gte":
                    sort === "default"
                      ? 50
                      : sort === "rating"
                        ? 200
                        : undefined,
                  with_genres: String(ANIMATION_GENRE_ID),
                  with_original_language: language,
                  ...(mediaType === "movie"
                    ? { primary_release_year: year || undefined }
                    : { first_air_date_year: year || undefined }),
                },
              ),
              mediaType,
              language,
            };
          } catch (error) {
            console.error(
              `Anime: failed to load ${mediaType}/${language}`,
              error,
            );
            return null;
          }
        }),
      ),
    );

    const loaded = responses.filter(
      (
        entry,
      ): entry is {
        data: CatalogResponse;
        mediaType: Exclude<CatalogMediaType, "all">;
        language: "ja" | "en";
      } => entry !== null,
    );

    if (!loaded.length) {
      return emptyCatalogResponse();
    }

    const dedupeAndSort = (entries: typeof loaded) => {
      const seen = new Set<string>();
      const items: CatalogItem[] = [];
      for (const { data, mediaType } of entries) {
        for (const item of data.results) {
          const key = `${mediaType}-${item.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({ ...item, media_type: mediaType });
        }
      }
      return sortCatalogItems(items, sort);
    };

    let results: CatalogItem[];
    if (origin === "all" && sort === "default") {
      // Anime-led mix: alternate the Japanese and Western streams starting
      // with the Japanese one, so the list opens with anime but still mixes
      // both origins throughout. Explicit sorts keep their global ordering.
      const japanese = dedupeAndSort(loaded.filter((e) => e.language === "ja"));
      const western = dedupeAndSort(
        loaded.filter((e) => e.language === "en"),
      );
      const seen = new Set<string>();
      results = [];
      const longestStream = Math.max(japanese.length, western.length);
      for (let index = 0; index < longestStream; index += 1) {
        for (const item of [japanese[index], western[index]]) {
          if (!item) continue;
          const key = `${item.media_type}-${item.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push(item);
        }
      }
    } else {
      results = dedupeAndSort(loaded);
    }

    return {
      page,
      results,
      total_pages: Math.min(
        500,
        Math.max(...loaded.map((entry) => entry.data.total_pages ?? 1)),
      ),
      total_results: loaded.reduce(
        (total, entry) => total + (entry.data.total_results ?? 0),
        0,
      ),
    };
  },
);

/**
 * Home-page row that deliberately alternates Japanese anime with
 * English-language animation so the line-up reads as a mix of both, not one
 * block of anime followed by a block of Western cartoons.
 */
export const getAnimeMixRow = cache(async (limit = 20) => {
  const [animeFeed, westernFeed] = await Promise.all([
    getAnimeCatalogPage({ origin: "anime", page: 1, sort: "default" }),
    getAnimeCatalogPage({ origin: "english", page: 1, sort: "default" }),
  ]);

  const seen = new Set<string>();
  const mixed: CatalogItem[] = [];
  const longestStream = Math.max(
    animeFeed.results.length,
    westernFeed.results.length,
  );

  for (let index = 0; index < longestStream; index += 1) {
    for (const item of [animeFeed.results[index], westernFeed.results[index]]) {
      if (!item || mixed.length >= limit) continue;

      const key = `${item.media_type}-${item.id}`;
      if (seen.has(key)) continue;

      seen.add(key);
      mixed.push(item);
    }

    if (mixed.length >= limit) break;
  }

  return mixed;
});

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
    let data: CatalogResponse;
    try {
      data = await tmdbFetch<CatalogResponse>(getSectionPath(mediaType, section), {
        language: "en-US",
        page,
      });
    } catch (error) {
      console.error(`Feed: failed to load ${mediaType}/${section}`, error);
      return emptyCatalogResponse();
    }

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
  if (!base) return null;
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

    if (!url) {
      return {
        page: 1,
        results: [] as CatalogItem[],
        total_pages: 1,
        total_results: 0,
      };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        next: { revalidate: 1800 },
      });
    } catch {
      return {
        page: 1,
        results: [] as CatalogItem[],
        total_pages: 1,
        total_results: 0,
      };
    }

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

async function _searchMulti({ query, page = 1 }: { query: string; page?: number }) {
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
}

/** Cached for Server Components — use in pages. */
export const getMultiSearch = cache(_searchMulti);

/** Uncached — safe for API route handlers where React.cache has no context. */
export const searchMultiRaw = _searchMulti;

export type SearchScope = "movie" | "tv" | "anime";

export function parseSearchTerm(value: SearchParamValue) {
  const term = getFirstValue(value);
  return typeof term === "string" ? term.trim() : "";
}

/**
 * Search that stays inside one catalog. `scope = "anime"` runs the movie and TV
 * searches and keeps only Animation results, so an Anime-tab search can never
 * surface a live-action title.
 */
async function _searchScoped({
  page = 1,
  query,
  scope,
}: {
  page?: number;
  query: string;
  scope: SearchScope;
}) {
  const term = query.trim();
  if (!term) return emptyCatalogResponse();

  const params = {
    include_adult: "false",
    language: "en-US",
    page,
    query: term,
  };

  try {
    if (scope === "anime") {
      const [movies, series] = await Promise.all([
        tmdbFetch<CatalogResponse>("/search/movie", params),
        tmdbFetch<CatalogResponse>("/search/tv", params),
      ]);

      const merged: CatalogItem[] = [
        ...movies.results.map((item) => ({
          ...item,
          media_type: "movie" as const,
        })),
        ...series.results.map((item) => ({
          ...item,
          media_type: "tv" as const,
        })),
      ].filter((item) => item.genre_ids?.includes(ANIMATION_GENRE_ID));

      return {
        page,
        results: sortCatalogItems(merged, "default"),
        total_pages: Math.min(
          500,
          Math.max(movies.total_pages ?? 1, series.total_pages ?? 1),
        ),
        total_results: merged.length,
      };
    }

    const path = scope === "tv" ? "/search/tv" : "/search/movie";
    return await tmdbFetch<CatalogResponse>(path, params);
  } catch (error) {
    console.error(`Search: failed to search ${scope} for "${term}"`, error);
    return emptyCatalogResponse();
  }
}

/** Cached for Server Components — use in pages. */
export const getScopedSearch = cache(_searchScoped);

/** Uncached — safe for API route handlers where React.cache has no context. */
export const searchScopedRaw = _searchScoped;

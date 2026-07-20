const RAW_BASE_URL = process.env.NEXT_PUBLIC_MOVIE_DB_BASE_URL ?? "";
const EMBOS_BASE_URL = "https://embos.top";

const BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

function withQuery(path: string, query: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }
  return `${BASE_URL}${path}?${params.toString()}`;
}

export function getMovieEmbedUrl(id: string) {
  return withQuery(`/movie/${encodeURIComponent(id)}/`, {
    autoplay: 1,
    muted: 1,
  });
}

export function getTVEpisodeEmbedUrl(
  seriesId: string,
  season: number,
  episode: number,
) {
  return withQuery(
    `/tv/${encodeURIComponent(seriesId)}/${season}/${episode}`,
    {
      autoplay: 1,
      muted: 1,
    },
  );
}

export function getMovieEmbedUrlAlt(id: string) {
  return `${EMBOS_BASE_URL}/movie/?mid=${encodeURIComponent(id)}`;
}

export function getTVEpisodeEmbedUrlAlt(
  seriesId: string,
  season: number,
  episode: number,
) {
  return `${EMBOS_BASE_URL}/tv/?mid=${encodeURIComponent(seriesId)}&s=${season}&e=${episode}`;
}

export const EMBED_BASE_URL = BASE_URL;

export type ServerId = "default" | "alt";

export type ServerConfig = {
  id: ServerId;
  label: string;
};

export const SERVERS: ServerConfig[] = [
  { id: "default", label: "Server 1" },
  { id: "alt", label: "Server 2" },
];

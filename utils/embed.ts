const RAW_BASE_URL = process.env.NEXT_PUBLIC_MOVIE_DB_BASE_URL ?? "";

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

export const EMBED_BASE_URL = BASE_URL;

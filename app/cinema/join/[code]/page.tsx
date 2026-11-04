import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getRoomByCode } from "@/lib/cinema/room-actions";
import { getMovieDetails } from "@/utils/getMovies";
import JoinRoomClient from "./JoinRoomClient";

function tmdbImage(path: string | null | undefined, size = "w1280") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export default async function JoinRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { code } = await params;
  const { t } = await searchParams;

  if (!session?.user) {
    const next = t
      ? `/cinema/join/${code}?t=${encodeURIComponent(t)}`
      : `/cinema/join/${code}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (!code || !code.trim()) notFound();

  const roomResult = await getRoomByCode(code.trim().toUpperCase());
  let backdrop: string | null = null;
  let poster: string | null = null;
  if (roomResult.ok) {
    const movie = await getMovieDetails(roomResult.data.movieId).catch(() => null);
    backdrop = tmdbImage(movie?.backdrop_path);
    poster = tmdbImage(movie?.poster_path, "w342");
  }

  // Initial room preview is fetched by the client (fresh seat count).
  return (
    <JoinRoomClient
      code={code.trim().toUpperCase()}
      token={t ?? ""}
      backdrop={backdrop}
      poster={poster}
    />
  );
}
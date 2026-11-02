import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import CreateCinemaClient from "./CreateCinemaClient";

export default async function CreateCinemaPage({
  searchParams,
}: {
  searchParams: Promise<{ movie?: string; title?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in?next=/cinema/create");
  }

  const { movie, title } = await searchParams;
  const movieId = movie?.trim();
  const movieTitle = title?.trim();

  return (
    <CreateCinemaClient
      userName={session.user.name ?? ""}
      initialMovie={
        movieId && /^\d+$/.test(movieId)
          ? { id: movieId, title: movieTitle || "Selected movie" }
          : null
      }
    />
  );
}
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TVSeriesDetailClient from "./TVSeriesDetailClient";
import { getTVDetails, getTVSeasonDetails } from "@/utils/tmdb";

type Props = {
  params: Promise<{ seriesID: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seriesID } = await params;
  const series = await getTVDetails(seriesID);

  if (!series) {
    return {
      title: "TV Series not found | StreamFlix",
    };
  }

  const year = series.first_air_date?.slice(0, 4);
  const title = year
    ? `${series.name} (${year}) | StreamFlix`
    : `${series.name} | StreamFlix`;
  const description =
    series.overview || `Watch ${series.name} and explore cast, seasons, and streaming details.`;
  const backdrop = series.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${series.backdrop_path}`
    : null;

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

export default async function TVSeriesDetailPage({ params, searchParams }: Props) {
  const { seriesID } = await params;
  const search = await searchParams;
  const seriesData = await getTVDetails(seriesID);

  if (!seriesData) {
    notFound();
  }

  const realSeasons =
    seriesData.seasons?.filter((season) => season.season_number > 0) || [];
  const fallbackSeason =
    realSeasons.length > 0 ? realSeasons[0].season_number : 1;

  // ?season=4&page=2 keeps a shared or refreshed link on the same season and
  // episode page the viewer was reading, instead of dropping back to episode 1.
  const requestedSeason = Number(search.season);
  const validSeason =
    Number.isInteger(requestedSeason) &&
    realSeasons.some((season) => season.season_number === requestedSeason)
      ? requestedSeason
      : fallbackSeason;
  const requestedPage = Math.floor(Number(search.page));
  const initialPage = Number.isFinite(requestedPage) && requestedPage > 1 ? requestedPage : 1;

  const seasonData = await getTVSeasonDetails(seriesID, validSeason);

  return (
    <TVSeriesDetailClient
      initialEpisodes={seasonData?.episodes || []}
      initialPage={initialPage}
      initialSeason={validSeason}
      seriesData={seriesData}
      seriesId={seriesID}
    />
  );
}

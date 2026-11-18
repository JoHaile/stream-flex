"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getTVSeasonDetails } from "@/utils/tmdb";
import {
  ClockIcon,
  PlayIcon,
  SearchIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime: number | null;
  air_date: string | null;
  vote_average: number;
}

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
}

interface EpisodeListProps {
  seriesId: string;
  seasons: Season[];
  initialEpisodes: Episode[];
  initialSeason: number;
  /** Owned by the parent so the page list and the in-player drawer cannot disagree. */
  selectedSeason: number;
  onSeasonChange: (season: number) => void;
  /** Fired once a season's episodes are known, so the player can show its metadata. */
  onEpisodesLoaded?: (season: number, episodes: Episode[]) => void;
  onEpisodeSelect?: (
    seasonNum: number,
    episodeNum: number,
    episode?: Episode,
  ) => void;
  currentEpisode?: { season: number; episode: number };
  /** "grid" is used on the season page, "list" inside the player drawer. */
  variant?: "grid" | "list";
}

const airDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatAirDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return airDateFormatter.format(date);
}

export default function EpisodeList({
  seriesId,
  seasons,
  initialEpisodes,
  initialSeason,
  selectedSeason,
  onSeasonChange,
  onEpisodesLoaded,
  onEpisodeSelect,
  currentEpisode,
  variant = "list",
}: EpisodeListProps) {
  const [fetched, setFetched] = useState<Record<number, Episode[]>>({});
  const [failedSeason, setFailedSeason] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  // Tagged with the season so switching seasons shows an unfiltered list without
  // clearing state inside an effect (which triggers an extra render pass).
  const [filterState, setFilterState] = useState({
    season: selectedSeason,
    term: "",
  });
  const episodeQuery =
    filterState.season === selectedSeason ? filterState.term : "";
  const setEpisodeQuery = (term: string) =>
    setFilterState({ season: selectedSeason, term });
  const railRef = useRef<HTMLDivElement>(null);

  // Read synchronously so the fetch effect can check the cache without listing it
  // as a dependency — otherwise every write would re-trigger the fetch.
  const fetchedRef = useRef<Record<number, Episode[]>>({});
  // Only the newest request may commit; otherwise switching seasons quickly lets
  // an earlier, slower response overwrite the season actually being viewed.
  const latestRequestRef = useRef(0);

  // The server-rendered season reads straight from props, so a fresh
  // `initialEpisodes` payload can never be shadowed by a stale cache entry.
  // `null` means "not known yet", which is what drives the skeleton — rather than
  // a lagging `loading` flag that would briefly render the previous season.
  const episodes =
    selectedSeason === initialSeason
      ? initialEpisodes
      : (fetched[selectedSeason] ?? null);

  useEffect(() => {
    if (selectedSeason === initialSeason) return;
    if (fetchedRef.current[selectedSeason]) return;

    const requestId = ++latestRequestRef.current;
    let cancelled = false;

    getTVSeasonDetails(seriesId, selectedSeason)
      .then((data) => {
        if (cancelled || requestId !== latestRequestRef.current) return;
        const next = {
          ...fetchedRef.current,
          [selectedSeason]: data?.episodes ?? [],
        };
        fetchedRef.current = next;
        setFetched(next);
      })
      .catch(() => {
        if (cancelled || requestId !== latestRequestRef.current) return;
        setFailedSeason(selectedSeason);
      });

    return () => {
      cancelled = true;
    };
  }, [seriesId, selectedSeason, initialSeason, retryNonce]);

  useEffect(() => {
    if (!episodes) return;
    onEpisodesLoaded?.(selectedSeason, episodes);
  }, [episodes, selectedSeason, onEpisodesLoaded]);

  // The rail scrolls the active season into view so the current choice is never
  // hidden off-screen.
  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>("[data-active=true]");
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedSeason]);

  const filteredSeasons = seasons.filter((season) => season.season_number > 0);

  const visibleEpisodes = useMemo(() => {
    if (!episodes) return null;
    const term = episodeQuery.trim().toLowerCase();
    if (!term) return episodes;

    return episodes.filter(
      (episode) =>
        episode.name.toLowerCase().includes(term) ||
        String(episode.episode_number) === term ||
        `e${episode.episode_number}` === term,
    );
  }, [episodes, episodeQuery]);

  const handleSeasonChange = (season: number) => {
    if (Number.isNaN(season) || season === selectedSeason) return;
    setFailedSeason(null);
    onSeasonChange(season);
  };

  const isActive = (episode: Episode) =>
    currentEpisode?.season === episode.season_number &&
    currentEpisode?.episode === episode.episode_number;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
              <span className="size-1.5 rounded-full bg-red-500" />
              Season {selectedSeason}
            </p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-white">
              {episodes
                ? `${episodes.length} episode${episodes.length === 1 ? "" : "s"}`
                : "Loading episodes…"}
            </h3>
          </div>

          {episodes && episodes.length > 8 ? (
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                value={episodeQuery}
                onChange={(event) => setEpisodeQuery(event.target.value)}
                placeholder="Find episode"
                aria-label="Find episode in this season"
                className="h-8 w-40 rounded-full border border-white/10 bg-white/[0.04] pl-8 pr-7 text-xs text-white placeholder:text-zinc-500 focus:border-red-500/40 focus:outline-none sm:w-44"
              />
              {episodeQuery ? (
                <button
                  type="button"
                  onClick={() => setEpisodeQuery("")}
                  aria-label="Clear episode search"
                  className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-white"
                >
                  <XIcon className="size-3" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          ref={railRef}
          className="hide-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
        >
          {filteredSeasons.map((season) => {
            const isSelected = season.season_number === selectedSeason;

            return (
              <button
                key={season.id}
                type="button"
                data-active={isSelected}
                onClick={() => handleSeasonChange(season.season_number)}
                aria-pressed={isSelected}
                className={cn(
                  "group flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  isSelected
                    ? "border-white bg-white text-black shadow-lg shadow-white/10"
                    : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                Season {season.season_number}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    isSelected
                      ? "bg-black/10 text-black/60"
                      : "bg-white/[0.06] text-zinc-500 group-hover:text-zinc-300",
                  )}
                >
                  {season.episode_count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {failedSeason === selectedSeason ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <TriangleAlertIcon className="size-5 text-amber-400" />
          <p className="text-sm text-zinc-400">
            Could not load Season {selectedSeason}.
          </p>
          <button
            onClick={() => {
              setFailedSeason(null);
              setRetryNonce((nonce) => nonce + 1);
            }}
            className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      ) : !visibleEpisodes ? (
        <div
          className={cn(
            variant === "grid"
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-2",
          )}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "animate-pulse rounded-xl border border-white/5 bg-white/[0.02]",
                variant === "grid" ? "overflow-hidden" : "flex gap-3 p-2",
              )}
            >
              <div
                className={cn(
                  "bg-white/[0.04]",
                  variant === "grid"
                    ? "aspect-video w-full"
                    : "h-16 w-28 shrink-0 rounded-lg",
                )}
              />
              <div className="flex-1 space-y-2 p-3">
                <div className="h-2.5 w-14 rounded bg-white/[0.05]" />
                <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
                <div className="h-2.5 w-20 rounded bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleEpisodes.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-zinc-500">
          {episodeQuery
            ? `No episodes match “${episodeQuery}” in Season ${selectedSeason}.`
            : `No episodes listed for Season ${selectedSeason}.`}
        </p>
      ) : (
        <div
          className={cn(
            variant === "grid"
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-2",
          )}
        >
          {visibleEpisodes.map((episode) => {
            const active = isActive(episode);
            const airDate = formatAirDate(episode.air_date);
            const isGrid = variant === "grid";

            return (
              <button
                key={episode.id}
                type="button"
                onClick={() =>
                  onEpisodeSelect?.(
                    episode.season_number,
                    episode.episode_number,
                    episode,
                  )
                }
                aria-current={active ? "true" : undefined}
                className={cn(
                  "group relative w-full overflow-hidden rounded-xl border text-left transition duration-200",
                  isGrid ? "flex flex-col" : "flex gap-3 p-2",
                  active
                    ? "border-red-500/50 bg-red-500/[0.07]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]",
                )}
              >
                <div
                  className={cn(
                    "relative shrink-0 overflow-hidden bg-zinc-800",
                    isGrid
                      ? "aspect-video w-full"
                      : "h-16 w-28 rounded-lg",
                  )}
                >
                  {episode.still_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                      alt={episode.name}
                      fill
                      sizes="(max-width: 640px) 90vw, 320px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                      <PlayIcon className="size-4 text-zinc-600" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70" />

                  <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/90 backdrop-blur-sm">
                    E{episode.episode_number}
                  </span>

                  {episode.runtime ? (
                    <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
                      <ClockIcon className="size-2.5" />
                      {episode.runtime}m
                    </span>
                  ) : null}

                  {active ? (
                    <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-500/30">
                      <span className="size-1.5 animate-pulse rounded-full bg-white" />
                      Playing
                    </span>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                      <span className="flex size-9 items-center justify-center rounded-full bg-white/90 shadow-xl">
                        <PlayIcon
                          className="ml-0.5 size-4 text-black"
                          fill="currentColor"
                        />
                      </span>
                    </div>
                  )}
                </div>

                <div className={cn("min-w-0", isGrid ? "p-3" : "flex-1 py-0.5 pr-1")}>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <span>Episode {episode.episode_number}</span>
                    {airDate ? (
                      <>
                        <span className="text-zinc-700">·</span>
                        <span className="normal-case tracking-normal text-zinc-500">
                          {airDate}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h4 className="mt-0.5 line-clamp-1 text-sm font-semibold leading-tight text-white group-hover:text-red-200">
                    {episode.name}
                  </h4>
                  {isGrid && episode.overview ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                      {episode.overview}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

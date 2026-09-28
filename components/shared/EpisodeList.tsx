"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getTVSeasonDetails } from "@/utils/tmdb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayIcon, ClockIcon } from "lucide-react";

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
}: EpisodeListProps) {
  const [fetched, setFetched] = useState<Record<number, Episode[]>>({});
  const [failedSeason, setFailedSeason] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

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

  const filteredSeasons = seasons.filter((s) => s.season_number > 0);

  const handleSeasonChange = (value: string | null) => {
    if (!value) return;
    const season = Number.parseInt(value, 10);
    if (Number.isNaN(season) || season === selectedSeason) return;
    setFailedSeason(null);
    onSeasonChange(season);
  };

  const isActive = (ep: Episode) =>
    currentEpisode?.season === ep.season_number &&
    currentEpisode?.episode === ep.episode_number;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Episodes</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Season</span>
          <Select
            value={String(selectedSeason)}
            onValueChange={handleSeasonChange}
          >
            <SelectTrigger className="min-w-[130px] border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 focus:ring-red-500">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent className="border border-zinc-700 bg-zinc-900 text-zinc-200">
              {filteredSeasons.map((season) => (
                <SelectItem
                  key={season.id}
                  value={String(season.season_number)}
                >
                  Season {season.season_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-y-auto scrollbar-left flex-1 max-h-[520px] pr-1">
        <div className="flex flex-col gap-2">
          {failedSeason === selectedSeason ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
              <p className="text-sm text-zinc-400">
                Could not load Season {selectedSeason}.
              </p>
              <button
                onClick={() => {
                  setFailedSeason(null);
                  setRetryNonce((nonce) => nonce + 1);
                }}
                className="mt-3 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
              >
                Try again
              </button>
            </div>
          ) : !episodes ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-lg animate-pulse bg-zinc-900"
              >
                <div className="w-28 h-16 rounded bg-zinc-800 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-zinc-800 rounded w-16" />
                  <div className="h-4 bg-zinc-800 rounded w-28" />
                  <div className="h-3 bg-zinc-800 rounded w-10" />
                </div>
              </div>
            ))
          ) : episodes.length === 0 ? (
            <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
              No episodes listed for Season {selectedSeason}.
            </p>
          ) : (
            episodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() =>
                  onEpisodeSelect?.(ep.season_number, ep.episode_number, ep)
                }
                className={`flex w-full gap-3 rounded-lg border p-3 text-left transition ${
                  isActive(ep)
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50"
                }`}
              >
                <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                  {ep.still_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                      alt={ep.name}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <PlayIcon className="w-4 h-4 text-zinc-500" />
                    </div>
                  )}
                  {isActive(ep) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                        <PlayIcon
                          className="w-3.5 h-3.5 text-black ml-0.5"
                          fill="currentColor"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-zinc-500">
                    Episode {ep.episode_number}
                  </span>
                  <h4 className="mt-0.5 line-clamp-1 text-sm font-semibold leading-tight text-white">
                    {ep.name}
                  </h4>
                  {ep.runtime && (
                    <div className="flex items-center gap-1 mt-1">
                      <ClockIcon className="h-3 w-3 text-zinc-600" />
                      <span className="text-xs text-zinc-500">
                        {ep.runtime}m
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

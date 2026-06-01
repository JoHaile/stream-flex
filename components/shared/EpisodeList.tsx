"use client";

import { useState, useEffect, useRef } from "react";
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
  onEpisodeSelect,
  currentEpisode,
}: EpisodeListProps) {
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [loadedEpisodes, setLoadedEpisodes] = useState<Episode[]>(initialEpisodes);
  const [loading, setLoading] = useState(false);
  const onEpisodeSelectRef = useRef(onEpisodeSelect);
  onEpisodeSelectRef.current = onEpisodeSelect;

  const episodes =
    selectedSeason === initialSeason ? initialEpisodes : loadedEpisodes;

  // Filter out season 0 (specials) for cleaner UX
  const filteredSeasons = seasons.filter((s) => s.season_number > 0);

  useEffect(() => {
    if (selectedSeason === initialSeason) {
      return;
    }

    const fetchSeason = async () => {
      setLoading(true);
      try {
        const data = await getTVSeasonDetails(seriesId, selectedSeason);
        if (data && data.episodes) {
          setLoadedEpisodes(data.episodes);
          if (data.episodes[0]) {
            onEpisodeSelectRef.current?.(
              selectedSeason,
              data.episodes[0].episode_number,
              data.episodes[0],
            );
          }
        }
      } catch (error) {
        console.error("Error fetching season:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeason();
  }, [selectedSeason, seriesId, initialSeason, initialEpisodes]);

  const handleSeasonChange = (value: string | null) => {
    if (value) {
      setSelectedSeason(parseInt(value));
    }
  };

  const isActive = (ep: Episode) =>
    currentEpisode?.season === ep.season_number &&
    currentEpisode?.episode === ep.episode_number;

  return (
    <div className="flex flex-col h-full">
      {/* Header with season selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Episodes</h3>
        <Select
          value={String(selectedSeason)}
          onValueChange={handleSeasonChange}
        >
          <SelectTrigger className="min-w-[130px] border-border bg-muted text-foreground hover:bg-accent">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent className="border border-border bg-card text-foreground">
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

      {/* Episode list */}
      <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar flex-1 max-h-[520px] pr-1">
        {loading ? (
          // Skeleton loaders
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-xl animate-pulse"
            >
              <div className="w-28 h-16 rounded-lg bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-muted rounded w-16" />
                <div className="h-4 bg-muted rounded w-28" />
                <div className="h-3 bg-muted rounded w-10" />
              </div>
            </div>
          ))
        ) : (
          episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() =>
                onEpisodeSelect?.(ep.season_number, ep.episode_number, ep)
              }
              className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                isActive(ep)
                  ? "border-sky-300/40 bg-sky-300/10"
                  : "border-border bg-muted hover:border-border hover:bg-accent/50"
              }`}
            >
              {/* Episode thumbnail */}
              <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {ep.still_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                    alt={ep.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <PlayIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                {isActive(ep) && (
                  <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-foreground/90 flex items-center justify-center">
                      <PlayIcon
                        className="w-3.5 h-3.5 text-background ml-0.5"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Episode info */}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-muted-foreground">
                  Episode {ep.episode_number}
                </span>
                <h4 className="mt-0.5 line-clamp-1 text-sm font-semibold leading-tight text-foreground">
                  {ep.name}
                </h4>
                {ep.runtime && (
                  <div className="flex items-center gap-1 mt-1">
                    <ClockIcon className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">
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
  );
}

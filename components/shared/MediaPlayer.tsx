"use client";

import { useEffect, useState } from "react";
import { ListIcon, XIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import EpisodeList from "@/components/shared/EpisodeList";

type EpisodeData = {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime: number | null;
  air_date: string | null;
  vote_average: number;
};

type SeasonData = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  info?: React.ReactNode;
  showEpisodes?: boolean;
  seriesId?: string;
  seasons?: SeasonData[];
  initialEpisodes?: EpisodeData[];
  initialSeason?: number;
  selectedSeason?: number;
  onSeasonChange?: (season: number) => void;
  onEpisodesLoaded?: (season: number, episodes: EpisodeData[]) => void;
  currentEpisode?: { season: number; episode: number };
  onSelectEpisode?: (
    seasonNum: number,
    episodeNum: number,
    episode?: EpisodeData,
  ) => void;
};

export default function MediaPlayer({
  isOpen,
  onClose,
  title,
  children,
  info,
  showEpisodes,
  seriesId,
  seasons,
  initialEpisodes,
  initialSeason,
  selectedSeason,
  onSeasonChange,
  onEpisodesLoaded,
  currentEpisode,
  onSelectEpisode,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEpisodeSelect = (
    seasonNum: number,
    episodeNum: number,
    episode?: EpisodeData,
  ) => {
    onSelectEpisode?.(seasonNum, episodeNum, episode);
    setSheetOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm landscape:bg-black landscape:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-5xl landscape:mx-0 landscape:flex landscape:h-full landscape:max-w-full landscape:items-center landscape:justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full rounded-lg bg-black shadow-2xl landscape:h-full landscape:max-h-screen landscape:rounded-none">
          <div className="relative aspect-video w-full pb-16 landscape:h-full landscape:pb-0">
            <button
              onClick={onClose}
              className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-red-500"
            >
              <XIcon className="h-3.5 w-3.5" />
              Close
            </button>

            {showEpisodes ? (
              <button
                onClick={() => setSheetOpen(true)}
                className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition hover:bg-black/90 hover:text-white"
              >
                <ListIcon className="h-3.5 w-3.5" />
                Seasons & Episodes
              </button>
            ) : null}

            {showEpisodes ? (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent keepMounted>
                  {seriesId &&
                  seasons &&
                  selectedSeason !== undefined &&
                  onSeasonChange ? (
                    <EpisodeList
                      seriesId={seriesId}
                      seasons={seasons}
                      initialEpisodes={initialEpisodes ?? []}
                      initialSeason={initialSeason ?? 1}
                      selectedSeason={selectedSeason}
                      onSeasonChange={onSeasonChange}
                      onEpisodesLoaded={onEpisodesLoaded}
                      onEpisodeSelect={handleEpisodeSelect}
                      currentEpisode={currentEpisode}
                    />
                  ) : null}
                </SheetContent>
              </Sheet>
            ) : null}

            {children}
          </div>

          {info ? (
            <div className="px-4 pb-4 pt-4 bg-gradient-to-t from-black/80 to-black landscape:absolute landscape:bottom-0 landscape:left-0 landscape:right-0">
              <div className="flex items-center justify-between">{info}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

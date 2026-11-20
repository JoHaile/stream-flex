"use client";

import { useEffect, useState } from "react";
import {
  ListIcon,
  LockIcon,
  LockOpenIcon,
  Maximize2,
  Minimize2,
  XIcon,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import EpisodeList from "@/components/shared/EpisodeList";
import { cn } from "@/lib/utils";

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
  // Opens as a centered popup (like the Gallery lightbox); the user can expand
  // it to true fullscreen with the toggle button.
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Popup mode only: a stray tap on the dimmed area used to close the player.
  // Locking parks that behaviour so an accidental touch cannot end playback.
  const [isLocked, setIsLocked] = useState(false);
  // Bumped on every blocked tap so the hint re-shows (and re-arms its timer).
  const [lockNotice, setLockNotice] = useState(0);
  // The player frame doubles as the portal target for the episode drawer in
  // popup mode, so the drawer is sized to the frame instead of the viewport.
  // Held as state (not a ref) because the portal resolves its container once on
  // mount, when an ancestor's ref has not been attached yet.
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lockNotice) return;
    const timer = setTimeout(() => setLockNotice(0), 2200);
    return () => clearTimeout(timer);
  }, [lockNotice]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // First Escape leaves fullscreen, the second one closes the player.
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen) return null;

  // Every close path also drops the fullscreen and lock state, so reopening
  // always starts as the centered, unlocked popup again.
  const handleClose = () => {
    setIsFullscreen(false);
    setIsLocked(false);
    setLockNotice(0);
    onClose();
  };

  // Backdrop taps close the popup — unless the player is locked, in which case
  // they only flash a reminder of how to unlock it.
  const handleBackdropClick = () => {
    if (isFullscreen) return;
    if (isLocked) {
      setLockNotice((count) => count + 1);
      return;
    }
    handleClose();
  };

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
      className={cn(
        "fixed inset-0 z-50",
        isFullscreen
          ? "bg-black"
          : "flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6",
      )}
      onClick={isFullscreen ? undefined : handleBackdropClick}
    >
      <div
        className={cn(
          // The tree shape stays identical in both modes (only classes change),
          // so the iframe is never remounted and playback never restarts.
          isFullscreen ? "h-full w-full" : "w-full max-w-5xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={setFrameEl}
          className={cn(
            "relative bg-black",
            isFullscreen
              ? "flex h-full w-full flex-col"
              : "overflow-hidden rounded-xl shadow-2xl ring-1 ring-zinc-700",
          )}
        >
          <div
            className={cn(
              "relative",
              // Fullscreen is a flex column: the video takes the space above
              // the info bar instead of the info bar overlaying the video, so
              // the player's native controls stay visible and clickable.
              isFullscreen ? "min-h-0 w-full flex-1" : "aspect-video w-full",
            )}
          >
            <button
              onClick={handleClose}
              className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-red-500"
            >
              <XIcon className="h-3.5 w-3.5" />
              Close
            </button>

            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
              {showEpisodes ? (
                <button
                  onClick={() => setSheetOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition hover:bg-black/90 hover:text-white"
                >
                  <ListIcon className="h-3.5 w-3.5" />
                  Seasons & Episodes
                </button>
              ) : null}

              {!isFullscreen ? (
                <button
                  onClick={() => {
                    setIsLocked((value) => !value);
                    setLockNotice(0);
                  }}
                  aria-pressed={isLocked}
                  aria-label={
                    isLocked
                      ? "Unlock player"
                      : "Lock player so taps outside the frame cannot close it"
                  }
                  title={
                    isLocked
                      ? "Player locked — taps outside no longer close it"
                      : "Lock player (taps outside will not close it)"
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition",
                    isLocked
                      ? "bg-amber-400 text-black hover:bg-amber-300"
                      : "bg-black/70 text-zinc-300 hover:bg-black/90 hover:text-white",
                  )}
                >
                  {isLocked ? (
                    <LockIcon className="h-3.5 w-3.5" />
                  ) : (
                    <LockOpenIcon className="h-3.5 w-3.5" />
                  )}
                  {isLocked ? "Locked" : "Lock"}
                </button>
              ) : null}

              <button
                onClick={() => setIsFullscreen((value) => !value)}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="flex items-center justify-center rounded-full bg-black/70 p-2 text-zinc-300 backdrop-blur-sm transition hover:bg-black/90 hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {showEpisodes ? (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                  keepMounted
                  // Fullscreen already spans the viewport, so the drawer keeps
                  // its edge-to-edge shape; the popup docks it to the frame.
                  contained={!isFullscreen}
                  container={isFullscreen ? undefined : (frameEl ?? undefined)}
                >
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
            <div
              className={cn(
                isFullscreen
                  ? "shrink-0 border-t border-zinc-800 bg-black px-4 py-3"
                  : "bg-gradient-to-t from-black/80 to-black px-4 pb-4 pt-4",
              )}
            >
              <div className="flex items-center justify-between">{info}</div>
            </div>
          ) : null}
        </div>
      </div>

      {isLocked && lockNotice > 0 ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-amber-400/30 bg-black/85 px-4 py-2 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-sm"
        >
          Player locked — tap the Lock button to close it
        </div>
      ) : null}
    </div>
  );
}

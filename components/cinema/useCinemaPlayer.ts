"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { getMovieEmbedUrl } from "@/utils/embed";

/**
 * The cinema room plays the movie in the provider's embed. The embed is
 * click-to-start (poster -> play button), but once its player is running it
 * accepts plain postMessage commands relayed down through its wrapper frames:
 *
 *   { player: true, action: "play" }
 *   { player: true, action: "pause" }
 *   { player: true, action: "seek<seconds>" }
 *   { player: true, action: "mute" | "unmute" }
 *
 * and reports back with PLAYER_EVENT messages:
 *
 *   { type: "PLAYER_EVENT", data: {
 *       player_status: "playing" | "paused" | "completed" | "seeked" | ...,
 *       player_progress: <seconds>, player_duration: <seconds> } }
 *
 * So we use the player's own (native, intuitive) controls as the source of
 * truth and only push commands to guests — no iframe re-mounting, no lost
 * position, no custom play/seek UI standing in front of the video.
 *
 * `startAt` is still used when the iframe is first created so a late joiner
 * opens at the host's current position instead of 00:00.
 */

export type PlayerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "seeked";

export interface PlayerSnapshot {
  status: PlayerStatus;
  position: number; // seconds
  duration: number; // seconds, 0 = unknown
}

export interface PlayerCommand {
  action: "play" | "pause" | "seek";
  position: number;
  isPlaying: boolean;
}

interface PlayerEventPayload {
  type?: string;
  data?: {
    player_status?: string;
    player_progress?: number;
    player_duration?: number;
  };
}

function toStatus(value: string | undefined): PlayerStatus {
  if (value === "playing") return "playing";
  if (value === "paused") return "paused";
  if (value === "completed" || value === "ended") return "ended";
  if (value === "seeked") return "seeked";
  return "ready";
}

export function useCinemaPlayer(
  movieId: string,
  initialState?: { position: number; playing: boolean },
  externalIframeRef?: RefObject<HTMLIFrameElement | null>,
) {
  // The embed URL never changes for a room, so it is simply derived. A guest
  // that opens later is placed at the stored position via `startAt` and then
  // corrected once on its first play (see RoomClient).
  const src = buildSrc(
    movieId,
    initialState?.position ?? 0,
    initialState?.playing ?? false,
  );
  const [status, setStatus] = useState<PlayerStatus>(
    initialState?.playing ? "playing" : "paused",
  );
  const [snapshot, setSnapshot] = useState<PlayerSnapshot>({
    status: initialState?.playing ? "playing" : "paused",
    position: initialState?.position ?? 0,
    duration: 0,
  });

  const internalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeRef = externalIframeRef ?? internalIframeRef;
  const positionRef = useRef(initialState?.position ?? 0);
  const durationRef = useRef(0);
  const statusRef = useRef<PlayerStatus>(
    initialState?.playing ? "playing" : "paused",
  );
  const onPlaybackChangeRef = useRef<((snapshot: PlayerSnapshot) => void) | null>(
    null,
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // -------------------------------------------------------------------------
  // Player -> parent (PLAYER_EVENT messages)
  // -------------------------------------------------------------------------

  const handleMessage = useCallback((event: MessageEvent) => {
    const raw = event.data as PlayerEventPayload | null;
    if (!raw || typeof raw !== "object" || raw.type !== "PLAYER_EVENT") return;
    const data = raw.data ?? (raw as PlayerEventPayload["data"]);
    if (!data) return;

    const s = toStatus(data.player_status);
    const seconds =
      typeof data.player_progress === "number" ? data.player_progress : null;
    const duration =
      typeof data.player_duration === "number" ? data.player_duration : null;

    const previous = positionRef.current;
    const jumped = seconds !== null && Math.abs(seconds - previous) > 1;
    if (seconds !== null) positionRef.current = seconds;
    if (duration !== null && duration > 0) durationRef.current = duration;

    // Progress events fire every few seconds while playing; only re-render on
    // a status change or a meaningful position jump.
    const statusChanged = s !== statusRef.current;
    if (statusChanged) statusRef.current = s;

    if (statusChanged || seconds === null || jumped) {
      setStatus(s);
      setSnapshot({
        status: s,
        position: seconds ?? positionRef.current,
        duration: durationRef.current,
      });
    } else if (seconds !== null) {
      setSnapshot((prev) =>
        prev.position === seconds
          ? prev
          : { ...prev, position: seconds, duration: durationRef.current },
      );
    }

    onPlaybackChangeRef.current?.({
      status: s,
      position: seconds ?? positionRef.current,
      duration: durationRef.current,
    });
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // -------------------------------------------------------------------------
  // Parent -> player (commands over postMessage)
  // -------------------------------------------------------------------------

  const postToPlayer = useCallback(
    (action: string) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return false;
      try {
        win.postMessage({ player: true, action }, "*");
        if (
          typeof window !== "undefined" &&
          (window as { __CINEMA_DEBUG?: boolean }).__CINEMA_DEBUG
        ) {
          console.log("[cinema-player] ->", action);
        }
        return true;
      } catch {
        return false;
      }
    },
    [iframeRef],
  );

  const applyCommand = useCallback(
    (command: PlayerCommand) => {
      const { action, position, isPlaying } = command;
      const target = Math.max(0, Math.round(position));
      // Seek first, then resume/pause — the embed applies messages in order.
      postToPlayer(`seek${target}`);
      const play = action === "play" ? true : action === "pause" ? false : isPlaying;
      postToPlayer(play ? "play" : "pause");

      positionRef.current = target;
      statusRef.current = play ? "playing" : "paused";
      setStatus(play ? "playing" : "paused");
      setSnapshot((prev) => ({
        ...prev,
        status: play ? "playing" : "paused",
        position: target,
      }));
    },
    [postToPlayer],
  );

  const onPlaybackChange = useCallback(
    (fn: ((s: PlayerSnapshot) => void) | null) => {
      onPlaybackChangeRef.current = fn;
    },
    [],
  );

  const getSnapshot = useCallback(
    () => ({
      status: statusRef.current,
      position: positionRef.current,
      duration: durationRef.current,
    }),
    [],
  );

  return {
    iframeRef,
    src,
    status,
    snapshot,
    applyCommand,
    onPlaybackChange,
    getSnapshot,
  };
}

function buildSrc(
  movieId: string,
  startSeconds: number,
  play: boolean,
) {
  return getMovieEmbedUrl(movieId, {
    startAt: Math.max(0, Math.floor(startSeconds)),
    autoplay: play ? 1 : 0,
  });
}

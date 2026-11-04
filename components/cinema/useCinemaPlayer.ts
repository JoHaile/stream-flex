"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMovieEmbedUrl } from "@/utils/embed";

/**
 * VidSrc player contract (no official parent→player command API):
 *   player → parent : { type: "PLAYER_EVENT", data: { player_info, player_status,
 *                      player_progress, player_duration, muted } }
 *   parent → player : URL params only (`autoplay`, `muted`, `startAt=<seconds>`).
 *
 * "Host" playback control is therefore implemented by swapping the iframe src:
 *   - play      : re-mount iframe with `autoplay=1&muted=1&startAt=<pos>`
 *   - pause     : re-mount iframe with `autoplay=0&muted=1&startAt=<pos>` so the
 *                 player loads paused at that position
 *   - seek      : re-mount iframe with `startAt=<pos>`
 *
 * Play/pause/mute buttons inside the iframe still work on their own (guest
 * watching locally); the room layer receives those changes via PLAYER_EVENT
 * and reports them as the guest's local state. The host's authoritative
 * commands always win.
 */

export type PlayerStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "ended";

export interface PlayerSnapshot {
  status: PlayerStatus;
  position: number; // seconds
  duration: number; // seconds, 0 = unknown
  muted: boolean;
}

export interface PlayerCommand {
  action: "play" | "pause" | "seek";
  position: number;
  isPlaying: boolean;
}

interface PlayerEventData {
  type?: string;
  data?: Record<string, unknown>;
  player_status?: string;
  player_progress?: number;
  player_duration?: number;
  muted?: number | boolean;
}

const EXTERNAL_GRACE_MS = 1500;

export function useCinemaPlayer(
  movieId: string,
  initialState?: { position: number; playing: boolean },
) {
  const [src, setSrc] = useState<string>(() =>
    buildSrc(movieId, initialState?.position ?? 0, initialState?.playing ?? false, true),
  );
  const [status, setStatus] = useState<PlayerStatus>(
    initialState?.playing ? "playing" : "paused",
  );
  const [snapshot, setSnapshot] = useState<PlayerSnapshot>({
    status: initialState?.playing ? "playing" : "paused",
    position: initialState?.position ?? 0,
    duration: 0,
    muted: true,
  });

  const positionRef = useRef(initialState?.position ?? 0);
  const durationRef = useRef(0);
  const mutedRef = useRef(true);
  const statusRef = useRef<PlayerStatus>(
    initialState?.playing ? "playing" : "paused",
  );
  const lastExternalAtRef = useRef(0);
  const pendingRemoteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPlaybackChangeRef = useRef<((snapshot: PlayerSnapshot) => void) | null>(null);

  // -------------------------------------------------------------------------
  // Player -> parent (PLAYER_EVENT messages)
  // -------------------------------------------------------------------------

  const handleMessage = useCallback((event: MessageEvent) => {
    const raw = event.data as PlayerEventData | null;
    if (!raw || typeof raw !== "object" || raw.type !== "PLAYER_EVENT") return;
    const data = raw.data ?? raw;
    const rawStatus = data.player_status;
    const seconds = typeof data.player_progress === "number" ? data.player_progress : null;
    const duration = typeof data.player_duration === "number" ? data.player_duration : null;
    const muted = typeof data.muted === "number" ? Boolean(data.muted) : data.muted;

    // Skip the echo of our own src swaps (they carry the state we just set).
    if (Date.now() - lastExternalAtRef.current < EXTERNAL_GRACE_MS) return;

    const statusChanged = (value: string): PlayerStatus => {
      if (value === "playing") return "playing";
      if (value === "completed") return "ended";
      if (value === "paused") return "paused";
      return "ready";
    };

    const s = statusChanged(typeof rawStatus === "string" ? rawStatus : "ready");
    if (s === "playing" || s === "paused" || s === "ended") {
      if (seconds !== null) positionRef.current = seconds;
      if (duration !== null && duration > 0) durationRef.current = duration;
      if (typeof muted === "boolean") mutedRef.current = muted;
      setStatus(s);
      setSnapshot({
        status: s,
        position: seconds ?? positionRef.current,
        duration: durationRef.current,
        muted: typeof muted === "boolean" ? muted : mutedRef.current,
      });
      onPlaybackChangeRef.current?.({ status: s, position: seconds ?? positionRef.current, duration: durationRef.current, muted: mutedRef.current });
    } else if (s === "ready") {
      // Player loaded; it will send status events soon after.
      setStatus((prev) => (prev === "paused" ? "loading" : prev));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // -------------------------------------------------------------------------
  // Parent -> player (host commands)
  // -------------------------------------------------------------------------

  const markExternal = useCallback((position: number) => {
    lastExternalAtRef.current = Date.now();
    if (pendingRemoteRef.current) clearTimeout(pendingRemoteRef.current);
    pendingRemoteRef.current = setTimeout(() => {
      pendingRemoteRef.current = null;
    }, EXTERNAL_GRACE_MS);
    positionRef.current = position;
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const swapSrc = useCallback(
    (position: number, play: boolean, muted: boolean = mutedRef.current) => {
      markExternal(position);
      setStatus(play ? "playing" : "paused");
      setSnapshot((prev) => ({ ...prev, position, status: play ? "playing" : "paused" }));
      setSrc(""); // unmount the iframe
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setSrc(buildSrc(movieId, position, play, muted));
      }));
    },
    [movieId, markExternal],
  );

  const applyCommand = useCallback(
    (command: PlayerCommand) => {
      const { action, position, isPlaying } = command;
      // A seek while playing must keep the movie playing (remount with autoplay).
      const play = action === "play" || (action === "seek" && isPlaying);
      // Only re-mount if we actually need to (avoids flapping on seek storm).
      if (action === "seek" && Math.abs(position - positionRef.current) < 2) {
        if (status === "playing" || status === "paused") return;
      }
      positionRef.current = position;
      swapSrc(position, play);
    },
    [swapSrc, status],
  );

  const onPlaybackChange = useCallback((fn: ((s: PlayerSnapshot) => void) | null) => {
    onPlaybackChangeRef.current = fn;
  }, []);

  const getSnapshot = useCallback(
    () => ({
      status,
      position: positionRef.current,
      duration: durationRef.current,
      muted: mutedRef.current,
    }),
    [status],
  );

  /**
   * Toggle the movie's audio. Because the embed exposes no command API, this
   * re-mounts the iframe at the current position with muted=0/1. It must run
   * from a user gesture (browser autoplay policy) when unmuting.
   */
  const setMuted = useCallback(
    (muted: boolean) => {
      if (mutedRef.current === muted) return;
      const position = positionRef.current;
      markExternal(position);
      mutedRef.current = muted;
      setSnapshot((prev) => ({ ...prev, muted }));
      const play = statusRef.current === "playing";
      setStatus((prev) => (play ? "playing" : prev));
      setSrc("");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSrc(buildSrc(movieId, position, play, muted));
        }),
      );
    },
    [movieId, markExternal],
  );

  return { src, status, snapshot, applyCommand, onPlaybackChange, getSnapshot, setMuted };
}

function buildSrc(movieId: string, startSeconds: number, play: boolean, muted: boolean) {
  return getMovieEmbedUrl(movieId, {
    startAt: Math.max(0, Math.floor(startSeconds)),
    autoplay: play ? 1 : 0,
    muted: muted ? 1 : 0,
  });
}
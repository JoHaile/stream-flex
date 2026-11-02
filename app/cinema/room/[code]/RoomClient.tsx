"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Link2,
  LoaderCircle,
  LogOut,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Users,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  getRoomDetailsByCode,
  getPlaybackState,
  hostPlaybackCommand,
  leaveRoom,
} from "@/lib/cinema/room-actions";
import { AblyRoomChannel, cinemaChannelName } from "@/lib/cinema/ably-client";
import type { PlaybackState, RoomDetails } from "@/lib/cinema/types";
import { useCinemaPlayer } from "@/components/cinema/useCinemaPlayer";
import VoicePanel from "@/components/cinema/VoicePanel";

type PlaybackPayload = {
  action: "play" | "pause" | "seek";
  positionSeconds: number;
  isPlaying: boolean;
  stateVersion: number;
};

const MODE_LABEL: Record<RoomDetails["mode"], string> = {
  MOVIE_ONLY: "Movie",
  VOICE: "Voice",
  VOICE_VIDEO: "Voice + video",
};

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export default function RoomClient({
  room,
  justCreated,
  inviteToken,
}: {
  room: RoomDetails;
  justCreated: boolean;
  inviteToken: string | null;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user.id ?? "";
  const isHost = room.isHost;

  const [playback, setPlayback] = useState<PlaybackState>(room.playback);
  const [details, setDetails] = useState<RoomDetails>(room);
  const [closing, setClosing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(justCreated);
  const [seekBuffer, setSeekBuffer] = useState<number | null>(null);

  const stateVersionRef = useRef(room.playback.stateVersion);
  const tickRef = useRef(Date.now());
  const channelRef = useRef<AblyRoomChannel | null>(null);

  const player = useCinemaPlayer(room.movieId, {
    position: playback.positionSeconds,
    playing: playback.isPlaying,
  });

  // Keep a mutable handle to the player API for event listeners.
  const playerRef = useRef(player);
  playerRef.current = player;

  const joinUrl = useMemo(() => {
    const base = `${window.location.origin}/cinema/join/${room.code}`;
    return inviteToken ? `${base}?t=${inviteToken}` : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.code, inviteToken]);

  // -------------------------------------------------------------------------
  // Applying external playback state (host commands / sync)
  // -------------------------------------------------------------------------

  const applyExternalPlayback = useCallback(
    (state: PlaybackState, force = false) => {
      if (!force && state.stateVersion <= stateVersionRef.current) return;
      stateVersionRef.current = Math.max(stateVersionRef.current, state.stateVersion);
      setPlayback(state);
      if (!isHost) {
        playerRef.current.applyCommand({
          action: state.isPlaying ? "play" : "pause",
          position: state.positionSeconds,
          isPlaying: state.isPlaying,
        });
      }
    },
    [isHost],
  );

  // -------------------------------------------------------------------------
  // Realtime bus: Ably (or polling fallback)
  // -------------------------------------------------------------------------

  useEffect(() => {
    let disposed = false;
    let ably: AblyRoomChannel | null = null;

    if (room.realtimeConfigured) {
      ably = new AblyRoomChannel(room.id, cinemaChannelName(room.id));
      ably.connect().then((result) => {
        if (disposed) return;
        if (!result.ok) {
          // Fall back to polling for the rest of this session.
          console.warn("Ably unavailable, polling instead:", result.reason);
          return;
        }
        channelRef.current = ably;
        ably!.onPlayback((message) => {
          const data = message.data as PlaybackPayload;
          if (data && typeof data.stateVersion === "number") {
            applyExternalPlayback({
              isPlaying: data.isPlaying,
              positionSeconds: data.positionSeconds,
              stateVersion: data.stateVersion,
              stateUpdatedAt: new Date().toISOString(),
            });
          }
        });
        if (userId) ably!.enterPresence(userId);
      });
    }

    const poll = setInterval(async () => {
      const state = await getPlaybackState(room.id);
      if (state.ok) {
        applyExternalPlayback(state.data);
        // Drift correction for guests: while the room is "playing", keep the
        // local player within ~6s of the server-authored position (server
        // timestamp + elapsed). Conservative, so no seeking on every tick.
        if (!isHost) {
          const snap = playerRef.current.getSnapshot();
          const target =
            state.data.positionSeconds +
            (Date.now() - Date.parse(state.data.stateUpdatedAt)) / 1000;
          if (snap.status === "playing" && Math.abs(snap.position - target) > 6) {
            playerRef.current.applyCommand({
              action: "seek",
              position: Math.round(target),
              isPlaying: true,
            });
          }
        }
      }
      // Refresh seat count + participant list periodically.
      const roomState = await getRoomDetailsByCode(room.code);
      if (roomState.ok && !disposed) {
        setDetails((prev) => ({
          ...prev,
          status: roomState.data.status,
          members: roomState.data.members,
          participants: roomState.data.participants,
        }));
      }
    }, room.realtimeConfigured ? 8000 : 4000);

    return () => {
      disposed = true;
      clearInterval(poll);
      channelRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.code, room.realtimeConfigured]);

  // Polling must also apply state when Ably IS configured but dropped out.
  useEffect(() => {
    if (!room.realtimeConfigured) return;
    const fallback = setInterval(async () => {
      if (channelRef.current?.configured) return;
      const state = await getPlaybackState(room.id);
      if (state.ok) applyExternalPlayback(state.data);
    }, 5000);
    return () => clearInterval(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.realtimeConfigured]);

  // Running clock to re-render the live position readout each second.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // -------------------------------------------------------------------------
  // Host commands
  // -------------------------------------------------------------------------

  const sendHostCommand = useCallback(
    async (action: "play" | "pause" | "seek", position: number) => {
      if (!isHost) return;
      setSyncError(null);
      const optimistic: PlaybackState = {
        isPlaying: action === "play" ? true : action === "pause" ? false : playback.isPlaying,
        positionSeconds: position,
        stateVersion: stateVersionRef.current + 1,
        stateUpdatedAt: new Date().toISOString(),
      };
      // Let the local player lead; the canonical state will arrive via the
      // action result below (host) or the Ably event (guests).
      playerRef.current.applyCommand({
        action,
        position,
        isPlaying: optimistic.isPlaying,
      });
      stateVersionRef.current += 1;
      setPlayback(optimistic);

      const result = await hostPlaybackCommand(room.id, {
        action,
        positionSeconds: position,
      });
      if (!result.ok) {
        setSyncError(result.error);
      }
    },
    [isHost, playback.isPlaying, room.id],
  );

  const togglePlay = useCallback(() => {
    if (!isHost) return;
    const position = Math.floor(
      playback.positionSeconds +
        (playback.isPlaying ? (Date.now() - tickRef.current) / 1000 : 0),
    );
    void sendHostCommand(playback.isPlaying ? "pause" : "play", position);
  }, [isHost, playback, sendHostCommand]);

  const seekBy = useCallback(
    (delta: number) => {
      if (!isHost) return;
      const position = Math.max(
        0,
        Math.floor(
          playback.positionSeconds +
            (playback.isPlaying ? (Date.now() - tickRef.current) / 1000 : 0) +
            delta,
        ),
      );
      void sendHostCommand("seek", position);
    },
    [isHost, playback, sendHostCommand],
  );

  const commitSeek = useCallback(
    (position: number) => {
      if (!isHost) return;
      setSeekBuffer(null);
      void sendHostCommand("seek", position);
    },
    [isHost, sendHostCommand],
  );

  const handleLeave = useCallback(async () => {
    if (closing) return;
    setClosing(true);
    await leaveRoom(room.id);
    router.push("/");
  }, [closing, room.id, router]);

  const forceSync = useCallback(() => {
    playerRef.current.applyCommand({
      action: playback.isPlaying ? "play" : "pause",
      position: playback.positionSeconds,
      isPlaying: playback.isPlaying,
    });
  }, [playback]);

  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [joinUrl]);

  // -------------------------------------------------------------------------
  // Derived display state
  // -------------------------------------------------------------------------

  const positionSeconds = playback.isPlaying
    ? playback.positionSeconds + (Date.now() - tickRef.current) / 1000
    : seekBuffer ?? playback.positionSeconds;

  const maxScrub = Math.max(player.snapshot.duration || 0, playback.positionSeconds + 60, 120);

  const closed = details.status !== "OPEN";
  const callEnabled =
    room.mode !== "MOVIE_ONLY" && room.livekitConfigured && !closed;


  return (
    <main className="min-h-screen bg-black pb-16 pt-28 text-white">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/")}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All movies
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">{room.name}</h1>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                {room.code}
              </span>
              <span className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400">
                {MODE_LABEL[room.mode]}
              </span>
              {closed ? (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-400">
                  Closed
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
                  Open
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {room.movieTitle} · hosted by {room.hostName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500 hover:text-white transition"
            >
              <Link2 className="h-4 w-4" />
              Invite
              {showInvite ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleLeave}
              disabled={closing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800 hover:text-white transition disabled:opacity-60"
            >
              {closing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {isHost ? "Close room" : "Leave"}
            </button>
          </div>
        </header>

        {/* Invite panel */}
        {showInvite ? (
          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">Invite your friends</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  They need a StreamFlix account to join. Anyone with the code can
                  enter this room.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded-lg border border-zinc-700 bg-black px-3 py-2 font-mono text-sm text-white">
                  {room.code}
                </code>
                <button
                  onClick={copyInvite}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-500 transition"
                >
                  {copied ? (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" /> Copy invite link
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* Realtime hint */}
        {!room.realtimeConfigured ? (
          <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
            <strong>Polling mode.</strong> Host controls refresh every few
            seconds — realtime sync (Ably) isn&rsquo;t configured on this
            server. Voice and video are disabled.
          </div>
        ) : null}

        {syncError ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {syncError}
          </div>
        ) : null}

        {closed ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            The host has closed this room. Playback controls are disabled.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Player + controls */}
          <section>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
              {player.src ? (
                <iframe
                  key={player.src}
                  src={player.src}
                  title={room.movieTitle}
                  allowFullScreen
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                  className="h-full w-full"
                />
              ) : null}
              {player.status === "paused" && playback.positionSeconds > 0 && !playback.isPlaying ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
                  <button
                    onClick={togglePlay}
                    disabled={!isHost || closed}
                    className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-xl hover:bg-red-500 transition disabled:opacity-50"
                    aria-label="Play"
                  >
                    <Play className="ml-0.5 h-6 w-6" />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Host controls */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {isHost
                    ? "Host controls — everyone follows you"
                    : "The host controls playback for everyone"}
                </p>
                <span className="font-mono text-sm text-zinc-200">
                  {formatTime(positionSeconds)} /{" "}
                  {player.snapshot.duration > 0
                    ? formatTime(player.snapshot.duration)
                    : "--:--"}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={Math.floor(maxScrub)}
                step={1}
                value={Math.floor(
                  seekBuffer ?? (playback.isPlaying ? positionSeconds : playback.positionSeconds),
                )}
                onChange={(e) => setSeekBuffer(Number(e.target.value))}
                onPointerUp={(e) => commitSeek(Number((e.target as HTMLInputElement).value))}
                onKeyUp={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    commitSeek(Number((e.target as HTMLInputElement).value));
                  }
                }}
                disabled={!isHost || closed}
                className="mt-2 w-full accent-red-500 disabled:opacity-40"
                aria-label="Seek"
              />

              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => seekBy(-30)}
                  disabled={!isHost || closed}
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" /> 30s
                </button>
                <button
                  onClick={togglePlay}
                  disabled={!isHost || closed}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-500 transition disabled:opacity-40"
                >
                  {playback.isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Play
                    </>
                  )}
                </button>
                <button
                  onClick={() => seekBy(30)}
                  disabled={!isHost || closed}
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-40"
                >
                  30s <RotateCw className="h-4 w-4" />
                </button>
                {!isHost ? (
                  <button
                    onClick={forceSync}
                    title="Re-sync to the host"
                    disabled={closed}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-40"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            {callEnabled ? (
              <VoicePanel
                room={{ ...details, livekitConfigured: true }}
                onLeave={() => undefined}
              />
            ) : null}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-zinc-400" />
                In the room
                <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {details.members}
                </span>
              </p>
              <ul className="space-y-2">
                {details.participants.map((participant) => (
                  <li key={participant.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600/20 text-[10px] font-bold text-red-400">
                      {participant.role === "HOST" ? "H" : (participant.name[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="truncate text-zinc-300">{participant.name}</span>
                    {participant.role === "HOST" ? (
                      <span className="ml-auto rounded bg-red-600/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                        Host
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
                You are {isHost ? "the host" : "a guest"}. Guests watch their own
                player — the movie streams from your own player to you, never
                through the room.
              </p>
            </div>

            {room.livekitConfigured === false && room.mode !== "MOVIE_ONLY" ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-500">
                Voice &amp; video were requested for this room, but LiveKit isn&rsquo;t
                configured on this server yet.
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
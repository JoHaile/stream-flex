"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Link2,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Send,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  createInviteLink,
  getRoomDetailsByCode,
  getPlaybackState,
  hostPlaybackCommand,
  leaveRoom,
  sendChatMessage,
  sendReaction,
} from "@/lib/cinema/room-actions";
import { AblyRoomChannel, cinemaChannelName } from "@/lib/cinema/ably-client";
import type { ChatMessage, PlaybackState, RoomDetails } from "@/lib/cinema/types";
import { CHAT_MAX_LENGTH } from "@/lib/cinema/types";
import { useCinemaPlayer } from "@/components/cinema/useCinemaPlayer";
import CallPanel from "@/components/cinema/CallPanel";

type PlaybackPayload = {
  action: "play" | "pause" | "seek";
  positionSeconds: number;
  isPlaying: boolean;
  stateVersion: number;
  stateUpdatedAt?: string;
};

type FloatingReaction = {
  key: number;
  emoji: string;
  name: string;
  left: number;
};

const REACTIONS = ["\u{1F44D}", "\u{2764}", "\u{1F602}", "\u{1F62E}", "\u{1F525}"];

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
  initialCallChoice,
}: {
  room: RoomDetails;
  justCreated: boolean;
  inviteToken: string | null;
  initialCallChoice: "audio" | "audio-video" | "silent" | null;
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
  const [showInvite, setShowInvite] = useState(false);
  const [freshInviteToken, setFreshInviteToken] = useState<string | null>(null);
  const [seekBuffer, setSeekBuffer] = useState<number | null>(null);
  const [muted, setMutedState] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [inCallIds, setInCallIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(room.messages ?? []);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [chatSending, setChatSending] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const chatCardRef = useRef<HTMLDivElement | null>(null);
  const chatVisibleRef = useRef(true);
  const chatOpenRef = useRef(true);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);
  const knownMessageIds = useRef(new Set(room.messages?.map((m) => m.id) ?? []));
  const knownPresence = useRef(new Set<string>(room.participants.map((p) => p.id)));
  const nameByIdRef = useRef(new Map(room.participants.map((p) => [p.id, p.name])));
  const systemSeq = useRef(0);

  const stateVersionRef = useRef(room.playback.stateVersion);
  const channelRef = useRef<AblyRoomChannel | null>(null);
  const syncingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useCinemaPlayer(room.movieId, {
    position: playback.positionSeconds,
    playing: playback.isPlaying,
  });

  // Keep a mutable handle to the player API for event listeners.
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const invitePath = useMemo(() => {
    const base = `/cinema/join/${room.code}`;
    const token = inviteToken ?? freshInviteToken;
    return token ? `${base}?t=${token}` : base;
  }, [room.code, inviteToken, freshInviteToken]);

  // -------------------------------------------------------------------------
  // Sound
  // -------------------------------------------------------------------------

  const changeMuted = useCallback((next: boolean) => {
    setMutedState(next);
    playerRef.current.setMuted(next);
  }, []);

  // -------------------------------------------------------------------------
  // Chat
  // -------------------------------------------------------------------------

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      if (knownMessageIds.current.has(message.id)) return;
      knownMessageIds.current.add(message.id);
      setMessages((prev) => [...prev.slice(-119), message]);
      if (
        message.kind !== "system" &&
        message.userId !== userId &&
        (!chatVisibleRef.current || !chatOpenRef.current)
      ) {
        setUnreadChat((n) => n + 1);
      }
    },
    [userId],
  );

  // Presence-derived chat lines ("Alex joined the room"). Ephemeral: they are
  // never persisted, so a reload only shows the real message history.
  const announcePresence = useCallback(
    (body: string) => {
      systemSeq.current += 1;
      appendMessage({
        id: `sys-${Date.now()}-${systemSeq.current}`,
        userId: "",
        name: "",
        body,
        at: new Date().toISOString(),
        kind: "system",
      });
    },
    [appendMessage],
  );

  useEffect(() => {
    for (const participant of details.participants) {
      nameByIdRef.current.set(participant.id, participant.name);
    }
  }, [details.participants]);

  useEffect(() => {
    const el = chatCardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio > 0.25,
        );
        chatVisibleRef.current = visible;
        if (visible && chatOpenRef.current) setUnreadChat(0);
      },
      { threshold: [0, 0.25, 0.5] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatInput("");
    try {
      const result = await sendChatMessage(room.id, text);
      if (result.ok) {
        appendMessage(result.data);
      } else {
        // Put the text back so nothing is silently lost.
        setChatInput((prev) => (prev ? prev : text));
        setSyncError(result.error);
      }
    } finally {
      setChatSending(false);
      requestAnimationFrame(() => {
        chatListRef.current?.scrollTo({
          top: chatListRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [appendMessage, chatInput, chatSending, room.id]);


  const pushReaction = useCallback((emoji: string, name: string) => {
    const key = Date.now() + Math.random();
    const left = 10 + Math.round(Math.random() * 70);
    setReactions((prev) => [...prev.slice(-14), { key, emoji, name, left }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.key !== key));
    }, 3600);
  }, []);

  const react = useCallback(
    (emoji: string) => {
      pushReaction(emoji, session?.user.name ?? "You");
      void sendReaction(room.id, emoji).then((result) => {
        if (!result.ok && result.code !== "NOT_CONFIGURED") {
          setSyncError(result.error);
        }
      });
    },
    [pushReaction, room.id, session?.user.name],
  );

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
        // Show a short "syncing" hint while the embed re-mounts.
        setSyncing(true);
        if (syncingTimerRef.current) clearTimeout(syncingTimerRef.current);
        syncingTimerRef.current = setTimeout(() => setSyncing(false), 1800);
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
          console.warn("Ably unavailable, polling instead:", result.reason);
          return;
        }
        channelRef.current = ably;
        const debugLog = (label: string, payload?: unknown) => {
          if (
            typeof window !== "undefined" &&
            (window as { __CINEMA_DEBUG?: boolean }).__CINEMA_DEBUG
          ) {
            console.log(`[cinema-debug] ${label}`, payload ?? "");
          }
        };
        debugLog("ably connected", cinemaChannelName(room.id));
        ably!.onPlayback((message) => {
          const data = message.data as PlaybackPayload;
          debugLog("playback event", data);
          if (data && typeof data.stateVersion === "number") {
            applyExternalPlayback({
              isPlaying: data.isPlaying,
              positionSeconds: data.positionSeconds,
              stateVersion: data.stateVersion,
              stateUpdatedAt: data.stateUpdatedAt ?? new Date().toISOString(),
            });
          }
        });
        ably!.onReaction((message) => {
          const data = message.data as { emoji?: string; name?: string };
          if (data?.emoji) pushReaction(data.emoji, data.name ?? "Someone");
        });
        ably!.onChat((message) => {
          const data = message.data as Partial<ChatMessage> & { name?: string };
          if (data && data.id && typeof data.body === "string") {
            appendMessage({
              id: data.id,
              userId: data.userId ?? "",
              name: data.name ?? "Guest",
              body: data.body,
              at: data.at ?? new Date().toISOString(),
            });
          }
        });
        ably!.onPresenceJoin((member) => {
          debugLog("presence enter", member.clientId);
          const id = member.clientId ?? "";
          if (!id || id === userId) return;
          if (knownPresence.current.has(id)) return;
          knownPresence.current.add(id);
          const data = member.data as { name?: string } | undefined;
          const name = data?.name || nameByIdRef.current.get(id) || "Someone";
          announcePresence(`${name} joined the room`);
        });
        ably!.onPresenceLeave((member) => {
          debugLog("presence leave", member.clientId);
          const id = member.clientId ?? "";
          if (!id || id === userId) return;
          if (!knownPresence.current.has(id)) return;
          knownPresence.current.delete(id);
          const data = member.data as { name?: string } | undefined;
          const name = data?.name || nameByIdRef.current.get(id) || "Someone";
          announcePresence(`${name} left the room`);
        });
        if (userId) {
          // Seed known members from the presence snapshot so people who were
          // already here are not announced as "joined" when we connect.
          ably!.listPresence().then((members) => {
            for (const member of members) {
              if (member.clientId && member.clientId !== userId) {
                knownPresence.current.add(member.clientId);
              }
            }
          });
          ably!
            .enterPresence({ name: session?.user.name ?? "Guest" })
            .then(() => debugLog("presence entered"));
        }
      });
    }

    const poll = setInterval(async () => {
      const state = await getPlaybackState(room.id);
      if (state.ok) {
        applyExternalPlayback(state.data);
        // Drift correction for guests: while the room is "playing", keep the
        // local player within ~10s of the server-authored position. More
        // conservative than before so the embed does not re-mount constantly.
        if (!isHost) {
          const snap = playerRef.current.getSnapshot();
          const target =
            state.data.positionSeconds +
            (Date.now() - Date.parse(state.data.stateUpdatedAt)) / 1000;
          if (snap.status === "playing" && Math.abs(snap.position - target) > 10) {
            playerRef.current.applyCommand({
              action: "seek",
              position: Math.round(target),
              isPlaying: true,
            });
            setSyncing(true);
            if (syncingTimerRef.current) clearTimeout(syncingTimerRef.current);
            syncingTimerRef.current = setTimeout(() => setSyncing(false), 1800);
          }
        }
      }
      const roomState = await getRoomDetailsByCode(room.code);
      if (roomState.ok && !disposed) {
        setDetails((prev) => ({
          ...prev,
          status: roomState.data.status,
          members: roomState.data.members,
          participants: roomState.data.participants,
        }));
        // Catch-up for polling mode (no Ably push): merge any new messages.
        roomState.data.messages.forEach(appendMessage);
      }
    }, 5000);

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
    }, 3000);
    return () => clearInterval(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.realtimeConfigured]);

  // Tick (live clock) + keep the sound button in sync with the embed.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      const snap = playerRef.current.getSnapshot();
      setMutedState((prev) => (prev === snap.muted ? prev : snap.muted));
    }, 1000);
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
        (playback.isPlaying
          ? (Date.now() - Date.parse(playback.stateUpdatedAt)) / 1000
          : 0),
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
            (playback.isPlaying
              ? (Date.now() - Date.parse(playback.stateUpdatedAt)) / 1000
              : 0) +
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

  // Host keyboard shortcuts: Space = play/pause, arrows = ±10s.
  useEffect(() => {
    if (!isHost) return;
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-10);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(10);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isHost, togglePlay, seekBy]);

  // -------------------------------------------------------------------------
  // Leaving / closing
  // -------------------------------------------------------------------------

  const handleLeave = useCallback(async () => {
    if (closing) return;
    if (
      isHost &&
      !window.confirm(
        "Close the room for everyone? Your guests will be disconnected from the cinema.",
      )
    ) {
      return;
    }
    setClosing(true);
    await leaveRoom(room.id);
    router.push("/");
  }, [closing, isHost, room.id, router]);

  // If the host closes the tab (or reloads), release the seat and close the
  // room via a beacon instead of leaving a zombie party behind.
  useEffect(() => {
    if (!isHost) return;
    const onHide = () => {
      const payload = JSON.stringify({ roomId: room.id });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/cinema/leave",
          new Blob([payload], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [isHost, room.id]);

  const forceSync = useCallback(() => {
    setSyncing(true);
    if (syncingTimerRef.current) clearTimeout(syncingTimerRef.current);
    syncingTimerRef.current = setTimeout(() => setSyncing(false), 1200);
    playerRef.current.applyCommand({
      action: playback.isPlaying ? "play" : "pause",
      position: playback.positionSeconds,
      isPlaying: playback.isPlaying,
    });
  }, [playback]);

  // Auto-scroll chat while the user is already at the bottom.
  useEffect(() => {
    if (!chatOpen) return;
    const el = chatListRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages, chatOpen]);

  const copyInvite = useCallback(async () => {
    try {
      let token = inviteToken ?? freshInviteToken;
      if (!token && isHost) {
        const result = await createInviteLink(room.id);
        if (result.ok) {
          token = result.data.token;
          setFreshInviteToken(token);
        }
      }
      const path = token ? `${invitePath}` : `/cinema/join/${room.code}`;
      const url = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [invitePath, inviteToken, freshInviteToken, isHost, room.id, room.code]);

  // -------------------------------------------------------------------------
  // Derived display state
  // -------------------------------------------------------------------------

  const positionSeconds = playback.isPlaying
    ? playback.positionSeconds +
      // eslint-disable-next-line react-hooks/purity
      (Date.now() - Date.parse(playback.stateUpdatedAt)) / 1000
    : seekBuffer ?? playback.positionSeconds;

  const maxScrub = Math.max(player.snapshot.duration || 0, playback.positionSeconds + 60, 120);

  const closed = details.status !== "OPEN";
  const callEnabled = room.mode !== "MOVIE_ONLY" && room.livekitConfigured;
  const inCall = useMemo(
    () => new Set(inCallIds.map((id) => id.replace(/^sf-/, ""))),
    [inCallIds],
  );

  return (
    <main className="min-h-screen bg-black pb-16 pt-20 text-white lg:pt-24">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        {/* Header */}
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
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
              <Link
                href={`/movies/${encodeURIComponent(room.movieId)}`}
                className="font-semibold text-white hover:text-red-400 transition"
              >
                {room.movieTitle}
              </Link>{" "}
              · hosted by {room.hostName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setChatOpen(true);
                setUnreadChat(0);
                chatCardRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
              }}
              aria-label="Room chat"
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
              {unreadChat > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadChat > 9 ? "9+" : unreadChat}
                </span>
              ) : null}
            </button>
            <button
              onClick={copyInvite}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500 hover:text-white transition"
            >
              {copied ? (
                <>
                  <Copy className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" /> Copy invite
                </>
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

        {/* Invite strip (compact, default closed) */}
        <section className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
          <span className="text-xs text-zinc-400">Invite friends:</span>
          {justCreated ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
              New
            </span>
          ) : null}
          <code className="rounded border border-zinc-700 bg-black px-2 py-1 font-mono text-sm tracking-wider text-white">
            {room.code}
          </code>
          <button
            onClick={copyInvite}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
          >
            <Link2 className="h-3 w-3" />
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => setShowInvite((v) => !v)}
            aria-expanded={showInvite}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            Invite details
            {showInvite ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </section>

        {/* Invite details */}
        {showInvite ? (
          <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">Invite your friends</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  They need a StreamFlix account to join. The code alone also
                  works — nothing to type into a URL, just share it.
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
          <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
            <strong>Polling mode.</strong> Host controls refresh every few
            seconds — realtime sync (Ably) isn&rsquo;t configured on this server. Voice
            and video are disabled.
          </div>
        ) : null}

        {syncError ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {syncError}
          </div>
        ) : null}

        {closed ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            {isHost
              ? "You closed this room. Guests can no longer join."
              : "The host has closed this room. Playback controls are disabled."}
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
                  className="h-full w-full"
                />
              ) : null}

              {muted && player.src ? (
                <button
                  onClick={() => changeMuted(false)}
                  className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/80 px-3.5 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-black"
                >
                  <VolumeX className="h-4 w-4" />
                  Tap to enable sound
                </button>
              ) : null}

              {player.status === "paused" &&
              playback.positionSeconds > 0 &&
              !playback.isPlaying &&
              isHost ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
                  <button
                    onClick={togglePlay}
                    className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-xl hover:bg-red-500 transition"
                    aria-label="Play"
                  >
                    <Play className="ml-0.5 h-6 w-6" />
                  </button>
                </div>
              ) : null}

              {syncing ? (
                <div className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Syncing with host…
                </div>
              ) : null}

              {/* Reaction burst */}
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                {reactions.map((r) => (
                  <span
                    key={r.key}
                    className="reaction-float absolute bottom-2 text-3xl leading-none"
                    style={{ left: `${r.left}%` }}
                    title={r.name}
                  >
                    {r.emoji}
                  </span>
                ))}
              </div>
            </div>

            {/* Playback controls / guest status */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              {isHost ? (
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Host controls — everyone follows you
                  </p>
                  <span className="font-mono text-sm text-zinc-200">
                    {formatTime(positionSeconds)} /{" "}
                    {player.snapshot.duration > 0
                      ? formatTime(player.snapshot.duration)
                      : "--:--"}
                  </span>
                </div>
              ) : (
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    The host controls playback for everyone
                  </p>
                  <span className="font-mono text-sm text-zinc-200">
                    {formatTime(positionSeconds)} /{" "}
                    {player.snapshot.duration > 0
                      ? formatTime(player.snapshot.duration)
                      : "--:--"}
                  </span>
                </div>
              )}

              {isHost ? (
                <>
                  <input
                    type="range"
                    min={0}
                    max={Math.floor(maxScrub)}
                    step={1}
                    value={Math.floor(
                      seekBuffer ??
                        (playback.isPlaying
                          ? positionSeconds
                          : playback.positionSeconds),
                    )}
                    onChange={(e) => setSeekBuffer(Number(e.target.value))}
                    onPointerUp={(e) =>
                      commitSeek(Number((e.target as HTMLInputElement).value))
                    }
                    onKeyUp={(e) => {
                      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        commitSeek(Number((e.target as HTMLInputElement).value));
                      }
                    }}
                    disabled={closed}
                    className="mt-2 w-full accent-red-500 disabled:opacity-40"
                    aria-label="Seek"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => seekBy(-30)}
                      disabled={closed}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-40"
                    >
                      <RotateCcw className="h-4 w-4" /> 30s
                    </button>
                    <button
                      onClick={togglePlay}
                      disabled={closed}
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
                      disabled={closed}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-40"
                    >
                      30s <RotateCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => changeMuted(!muted)}
                      aria-pressed={!muted}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        muted
                          ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          : "bg-zinc-200 text-black hover:bg-white"
                      }`}
                    >
                      {muted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      {muted ? "Sound off" : "Sound on"}
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-zinc-600">
                    Shortcuts: Space = play/pause · ←/→ = seek 10s
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-300">
                    {closed
                      ? "This room is closed."
                      : playback.isPlaying
                        ? "Host is playing — your player follows along."
                        : playback.positionSeconds > 0
                          ? "Host has paused the movie."
                          : "Waiting for the host to start the movie…"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={forceSync}
                      disabled={closed}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-40"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                      />
                      Re-sync with host
                    </button>
                    <button
                      onClick={() => changeMuted(!muted)}
                      aria-pressed={!muted}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                        muted
                          ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          : "bg-zinc-200 text-black hover:bg-white"
                      }`}
                    >
                      {muted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      {muted ? "Unmute movie" : "Mute movie"}
                    </button>
                  </div>
                </>
              )}

              {/* Reactions */}
              {room.realtimeConfigured ? (
                <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-800 pt-3">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    React
                  </span>
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => react(emoji)}
                      aria-label={`React with ${emoji}`}
                      className="h-8 w-8 rounded-full bg-zinc-800 text-base transition hover:scale-110 hover:bg-zinc-700"
                    >
                      {emoji}
                    </button>
                  ))}
                  <span className="ml-auto text-[11px] text-zinc-600">
                    Everyone in the room sees your reaction
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            {callEnabled ? (
              <CallPanel
                room={{ ...details, livekitConfigured: true }}
                initialChoice={initialCallChoice ?? undefined}
                onInCallChange={setInCallIds}
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
                      {(participant.name[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="truncate text-zinc-300">{participant.name}</span>
                    {inCall.has(participant.id) ? (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        In call
                      </span>
                    ) : null}
                    {participant.role === "HOST" ? (
                      <span className="ml-auto rounded bg-red-600/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                        Host
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
                You are {isHost ? "the host" : "a guest"}. Guests watch their
                own player — the movie streams to you directly, never through the
                room.
              </p>
            </div>

            <div
              ref={chatCardRef}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60"
            >
              <button
                type="button"
                onClick={() => {
                  const next = !chatOpen;
                  setChatOpen(next);
                  if (next) setUnreadChat(0);
                }}
                aria-expanded={chatOpen}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-zinc-800/40"
              >
                <MessageCircle className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-bold text-white">Room chat</span>
                {!chatOpen && unreadChat > 0 ? (
                  <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadChat}
                  </span>
                ) : (
                  <span className="ml-auto text-[11px] text-zinc-500">
                    {messages.filter((m) => m.kind !== "system").length} message
                    {messages.filter((m) => m.kind !== "system").length === 1
                      ? ""
                      : "s"}
                  </span>
                )}
              </button>
              {chatOpen ? (
                <div className="border-t border-zinc-800 p-3">
                  <div
                    ref={chatListRef}
                    aria-live="polite"
                    className="h-56 space-y-2.5 overflow-y-auto pr-1"
                  >
                    {messages.length === 0 ? (
                      <p className="text-xs leading-relaxed text-zinc-500">
                        Say hi 👋 — everyone in the room sees your
                        messages live.
                      </p>
                    ) : (
                      messages.map((m) => {
                        if (m.kind === "system") {
                          return (
                            <p
                              key={m.id}
                              className="text-center text-[11px] leading-relaxed text-zinc-500"
                            >
                              {m.body}
                            </p>
                          );
                        }
                        const mine = m.userId === userId;
                        return (
                          <div
                            key={m.id}
                            className={`rounded-lg px-2.5 py-1.5 text-sm ${
                              mine
                                ? "bg-red-600/10 ring-1 ring-red-500/20"
                                : "bg-zinc-800/60"
                            }`}
                          >
                            <div className="mb-0.5 flex items-baseline gap-2">
                              <span
                                className={`truncate text-[11px] font-bold ${
                                  mine ? "text-red-300" : "text-zinc-300"
                                }`}
                              >
                                {mine ? "You" : m.name}
                              </span>
                              <span className="ml-auto shrink-0 text-[10px] text-zinc-500">
                                {new Date(m.at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-zinc-100">
                              {m.body}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendChat();
                    }}
                    className="mt-2 flex items-center gap-2"
                  >
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      maxLength={CHAT_MAX_LENGTH}
                      placeholder={closed ? "Room closed" : "Message the room…"}
                      disabled={closed}
                      aria-label="Chat message"
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={closed || !chatInput.trim() || chatSending}
                      aria-label="Send message"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-500 disabled:opacity-40"
                    >
                      {chatSending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                  {closed ? (
                    <p className="mt-1.5 text-[11px] text-zinc-500">
                      Chat is closed with the room.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {room.livekitConfigured === false && room.mode !== "MOVIE_ONLY" ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-500">
                Voice &amp; video were requested for this room, but LiveKit
                isn&rsquo;t configured on this server yet.
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

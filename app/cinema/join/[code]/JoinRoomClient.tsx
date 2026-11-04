"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clapperboard,
  Headphones,
  LoaderCircle,
  LockIcon,
  Mic,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { getRoomByCode, joinRoom } from "@/lib/cinema/room-actions";
import { ROOM_MODES, type RoomInvitePreview } from "@/lib/cinema/types";
import { useSession } from "@/lib/auth-client";

const MODE_LABELS: Record<(typeof ROOM_MODES)[number], string> = {
  MOVIE_ONLY: "Movie only",
  VOICE: "Voice room",
  VOICE_VIDEO: "Voice + video room",
};

type CallChoice = "audio" | "audio-video" | "silent";

function Avatar({
  image,
  name,
  size = "h-7 w-7",
}: {
  image: string | null;
  name: string;
  size?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className={`${size} rounded-full object-cover ring-2 ring-zinc-900`}
      />
    );
  }
  return (
    <span
      className={`${size} flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-fuchsia-500 text-[10px] font-bold text-white ring-2 ring-zinc-900`}
    >
      {(name[0] ?? "?").toUpperCase()}
    </span>
  );
}

export default function JoinRoomClient({
  code,
  token,
  backdrop,
  poster,
}: {
  code: string;
  token: string;
  backdrop: string | null;
  poster: string | null;
}) {
  const router = useRouter();
  const { isPending: sessionPending } = useSession();
  const [room, setRoom] = useState<RoomInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [callChoice, setCallChoice] = useState<CallChoice>("audio");

  function loadRoom() {
    setError(null);
    getRoomByCode(code).then((result) => {
      if (result.ok) setRoom(result.data);
      else setError(result.error);
    });
  }

  useEffect(() => {
    let cancelled = false;
    getRoomByCode(code).then((result) => {
      if (cancelled) return;
      if (result.ok) setRoom(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleJoin() {
    if (joining) return;
    setJoining(true);
    setError(null);
    const result = await joinRoom({ code, token });
    if (!result.ok) {
      setJoining(false);
      setError(result.error);
      return;
    }
    const wantsCall = room && room.mode !== "MOVIE_ONLY";
    router.push(`/cinema/room/${code}${wantsCall ? `?call=${callChoice}` : ""}`);
  }

  if (sessionPending || (!room && !error)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <LoaderCircle className="h-6 w-6 animate-spin text-zinc-500" />
      </main>
    );
  }

  const seatsLeft = room ? Math.max(0, room.capacity - room.members) : 0;
  const isFull = room ? seatsLeft === 0 : false;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-16 text-white">
      {backdrop ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdrop}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black" />
        </>
      ) : null}

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur md:p-8">
          {error && !room ? (
            <div>
              <LockIcon className="mb-4 h-8 w-8 text-zinc-400" />
              <h1 className="mb-2 text-xl font-black tracking-tight">
                Can&rsquo;t open this room
              </h1>
              <p className="mb-6 text-sm text-zinc-300">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={loadRoom}
                  className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Try again
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
                >
                  Back to StreamFlix
                </button>
              </div>
            </div>
          ) : room ? (
            <div>
              <div className="mb-5 flex items-start gap-4">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt=""
                    className="hidden h-40 w-28 rounded-xl object-cover shadow-xl ring-1 ring-zinc-700 sm:block"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Clapperboard className="h-5 w-5 text-red-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                      You&rsquo;re invited
                    </span>
                  </div>
                  <h1 className="mb-1 text-xl font-black tracking-tight">
                    {room.name}
                  </h1>
                  <p className="mb-1 text-xs font-medium text-zinc-400">
                    Room code{" "}
                    <span className="font-mono tracking-wider text-zinc-100">
                      {room.code}
                    </span>
                  </p>
                  <p className="text-sm text-zinc-300">
                    {room.movieTitle} · hosted by {room.hostName}
                  </p>
                </div>
              </div>

              {room.participants.length > 0 ? (
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex -space-x-1.5">
                    {room.participants.slice(0, 6).map((p) => (
                      <Avatar key={p.id} image={p.image} name={p.name} />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-300">
                    <strong className="text-white">{room.members}</strong> of{" "}
                    {room.capacity} seats taken
                  </span>
                </div>
              ) : null}

              <div className="mb-5 space-y-2 rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">Movie</span>
                  <span className="truncate font-medium text-white">
                    {room.movieTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Mode</span>
                  <span className="font-medium text-white">
                    {MODE_LABELS[room.mode] ?? room.mode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Users className="h-3.5 w-3.5" />
                    Seats
                  </span>
                  <span className="font-medium text-white">
                    {room.members} / {room.capacity}
                  </span>
                </div>
              </div>

              {isFull ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                  This room is full right now. Ask the host to free a seat,
                  then try again.
                </div>
              ) : room.status !== "OPEN" ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                  This cinema room has closed.
                </div>
              ) : (
                <>
                  {room.mode !== "MOVIE_ONLY" ? (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        When you join
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {(
                          [
                            { value: "audio", label: "Audio only", icon: Headphones },
                            ...(room.mode === "VOICE_VIDEO"
                              ? [
                                  {
                                    value: "audio-video",
                                    label: "Audio + video",
                                    icon: Video,
                                  },
                                ]
                              : []),
                            {
                              value: "silent",
                              label: "Just watching",
                              icon: VideoOff,
                            },
                          ] as Array<{
                            value: CallChoice;
                            label: string;
                            icon: typeof Mic;
                          }>
                        ).map((option) => {
                          const Icon = option.icon;
                          const active = callChoice === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setCallChoice(option.value)}
                              aria-pressed={active}
                              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                                active
                                  ? "border-red-500 bg-red-500/10 text-white"
                                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                              }`}
                            >
                              {active ? (
                                <Check className="h-3.5 w-3.5 text-red-400" />
                              ) : (
                                <Icon className="h-3.5 w-3.5" />
                              )}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        You can mute, turn your camera on/off or switch devices
                        any time once you&rsquo;re inside.
                      </p>
                    </div>
                  ) : (
                    <p className="mb-4 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clapperboard className="h-3.5 w-3.5" />
                      Movie only — no mic or camera needed.
                    </p>
                  )}

                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {joining ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Joining...
                      </span>
                    ) : (
                      `Join room (${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left)`
                    )}
                  </button>
                </>
              )}

              {error ? (
                <div className="mt-3 flex items-center gap-2">
                  <p className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                  <button
                    onClick={handleJoin}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-100 transition hover:border-zinc-500 hover:text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
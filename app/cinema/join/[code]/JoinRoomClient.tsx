"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, LoaderCircle, LockIcon, Users } from "lucide-react";
import { getRoomByCode, joinRoom } from "@/lib/cinema/room-actions";
import { ROOM_MODES, type RoomInvitePreview } from "@/lib/cinema/types";
import { useSession } from "@/lib/auth-client";

const MODE_LABELS: Record<(typeof ROOM_MODES)[number], string> = {
  MOVIE_ONLY: "Movie only",
  VOICE: "Voice room",
  VOICE_VIDEO: "Voice + video room",
};

export default function JoinRoomClient({
  code,
  token,
}: {
  code: string;
  token: string;
}) {
  const router = useRouter();
  const { isPending: sessionPending } = useSession();
  const [room, setRoom] = useState<RoomInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

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
    router.push(`/cinema/room/${code}`);
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
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-16 text-white">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl">
          {error && !room ? (
            <div>
              <LockIcon className="mb-4 h-8 w-8 text-zinc-500" />
              <h1 className="mb-2 text-xl font-black tracking-tight">
                Can&rsquo;t open this room
              </h1>
              <p className="mb-6 text-sm text-zinc-400">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition"
              >
                Back to StreamFlix
              </button>
            </div>
          ) : (
            room && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Clapperboard className="h-5 w-5 text-red-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                    You&rsquo;re invited
                  </span>
                </div>
                <h1 className="mb-1 text-xl font-black tracking-tight">
                  {room.name}
                </h1>
                <p className="mb-2 text-xs font-medium text-zinc-500">
                  Room code <span className="font-mono text-zinc-300">{room.code}</span>
                </p>
                <p className="mb-6 text-sm text-zinc-400">
                  Watching <span className="font-semibold text-white">{room.movieTitle}</span>{" "}
                  with your friends. Hosted by {room.hostName}.
                </p>

                <div className="mb-6 space-y-2 rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Movie</span>
                    <span className="font-medium text-white">{room.movieTitle}</span>
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
                )}

                {error ? (
                  <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                ) : null}
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
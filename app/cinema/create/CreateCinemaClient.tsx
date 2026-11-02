"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  MicIcon,
  VideoIcon,
  Users,
} from "lucide-react";
import {
  MAX_CAPACITY,
  MIN_CAPACITY,
  type RoomMode,
} from "@/lib/cinema/types";
import MovieSearchStep from "./MovieSearchStep";

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: "Room setup",
  2: "How will you talk?",
  3: "Pick the movie",
};

const MODE_OPTIONS: Array<{
  value: RoomMode;
  label: string;
  description: string;
  icon: typeof Clapperboard;
}> = [
  {
    value: "MOVIE_ONLY",
    label: "Movie only",
    description: "Just the movie. No microphone or camera.",
    icon: Clapperboard,
  },
  {
    value: "VOICE",
    label: "Voice",
    description: "Talk while you watch. No camera required.",
    icon: MicIcon,
  },
  {
    value: "VOICE_VIDEO",
    label: "Voice + video",
    description: "See and hear each other alongside the movie.",
    icon: VideoIcon,
  },
];

export default function CreateCinemaClient({
  userName,
  initialMovie,
}: {
  userName: string;
  initialMovie?: { id: string; title: string } | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialMovie ? 3 : 1);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(5);
  const [mode, setMode] = useState<RoomMode>("MOVIE_ONLY");
  const [movie, setMovie] = useState<{ id: string; title: string } | null>(
    initialMovie ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultName = useMemo(() => `${userName || "Someone"}'s Cinema`, [userName]);
  const roomName = name.trim() || defaultName;

  const canContinueStep1 = capacity >= MIN_CAPACITY && capacity <= MAX_CAPACITY;
  const canCreate = Boolean(movie && roomName);

  async function handleCreate() {
    if (!movie || creating) return;
    setCreating(true);
    setError(null);
    // Dynamic import so the server action module is only loaded on submit.
    const { createRoom } = await import("@/lib/cinema/room-actions");
    const result = await createRoom({
      name: roomName,
      capacity,
      mode,
      movieId: movie.id,
      movieTitle: movie.title,
    });
    if (!result.ok) {
      setCreating(false);
      setError(result.error);
      return;
    }
    router.push(
      `/cinema/room/${result.data.code}?created=1&invite=${encodeURIComponent(result.data.inviteToken)}`,
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-16 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">
              Create a cinema room
            </h1>
            <span className="text-xs font-medium text-zinc-500">
              Step {step} of 3
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-red-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-400">{STEP_TITLES[step]}</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <section className="space-y-8">
            <div>
              <label
                htmlFor="room-name"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Room name <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                id="room-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={defaultName}
                maxLength={80}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Leave blank to use &ldquo;{defaultName}&rdquo;
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Users className="h-4 w-4 text-zinc-400" />
                Maximum participants
              </div>
              <p className="mb-3 text-xs text-zinc-500">
                You count as one. Capacity {MIN_CAPACITY}&ndash;{MAX_CAPACITY}.
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: MAX_CAPACITY - MIN_CAPACITY + 1 }, (_, i) => {
                  const value = MIN_CAPACITY + i;
                  const selected = value === capacity;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCapacity(value)}
                      aria-pressed={selected}
                      className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
                        selected
                          ? "bg-red-600 text-white"
                          : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {capacity} seat{capacity === 1 ? "" : "s"} total — you +{" "}
                {capacity - 1} friend{capacity - 1 === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => router.push("/")}
                className="text-sm font-medium text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <div className="grid gap-3 sm:grid-cols-3">
              {MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = option.value === mode;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    aria-pressed={selected}
                    className={`rounded-xl border p-5 text-left transition ${
                      selected
                        ? "border-red-500 bg-red-500/10 ring-2 ring-red-500/30"
                        : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-500"
                    }`}
                  >
                    <Icon
                      className={`mb-3 h-5 w-5 ${selected ? "text-red-400" : "text-zinc-400"}`}
                    />
                    <p className="text-sm font-bold">{option.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">
              Voice and video are separate from the movie. You will only be
              asked for microphone or camera access after choosing to turn them
              on inside the room.
            </p>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <MovieSearchStep
              movie={movie}
              onSelect={setMovie}
              onBack={() => setStep(2)}
              onCreate={handleCreate}
              creating={creating}
              canCreate={canCreate}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
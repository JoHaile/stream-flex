"use client";

// "Have a code?" — join a cinema room by its 8-character code. Used on the
// home page (card) and in the navbar popover / mobile drawer.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DoorOpen } from "lucide-react";

export default function JoinByCode({
  variant = "card",
  autoFocus = false,
  onJoined,
}: {
  variant?: "card" | "nav";
  /** Focus the code input as soon as it mounts (used inside the nav popover). */
  autoFocus?: boolean;
  /** Called after a valid code is submitted, before navigation. */
  onJoined?: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 4) {
      setError("Enter the 8-character room code.");
      return;
    }
    setError(null);
    onJoined?.();
    router.push(`/cinema/join/${encodeURIComponent(clean)}`);
  };

  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
          <DoorOpen className="h-4 w-4 text-red-400" />
          Have a room code?
        </p>
        <p className="mb-3 text-xs text-zinc-400">
          A friend sent you a code — jump straight into their cinema.
        </p>
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. 6DA7XJDF"
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            aria-label="Room code"
            className="flex-1 rounded-lg border border-zinc-700 bg-black px-3.5 py-2.5 font-mono text-sm uppercase tracking-widest text-white placeholder-zinc-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
          >
            Join
          </button>
        </form>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1.5"
      role="search"
      aria-label="Join a cinema room by code"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Room code"
        maxLength={12}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        aria-label="Room code"
        className="w-36 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs uppercase tracking-widest text-white placeholder-zinc-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
      />
      <button
        type="submit"
        className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-red-500"
      >
        Join
      </button>
    </form>
  );
}
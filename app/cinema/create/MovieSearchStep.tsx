"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, LoaderCircle, SearchIcon } from "lucide-react";

type SearchItem = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
};

export default function MovieSearchStep({
  movie,
  onSelect,
  onBack,
  onCreate,
  creating,
  canCreate,
}: {
  movie: { id: string; title: string } | null;
  onSelect: (m: { id: string; title: string }) => void;
  onBack: () => void;
  onCreate: () => void;
  creating: boolean;
  canCreate: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
       
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const list: SearchItem[] = (data.results ?? []).filter(
          (r: SearchItem) => r.media_type === "movie",
        );
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function poster(path: string | null) {
    return path
      ? `https://image.tmdb.org/t/p/w185${path}`
      : null;
  }

  const selected = results.find((r) => String(r.id) === movie?.id) ?? null;
  const year = selected
    ? (selected.release_date || selected.first_air_date || "").slice(0, 4)
    : "";

  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a movie to watch together..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-10 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
        />
        {loading ? (
          <LoaderCircle className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
        ) : null}
      </div>

      {query.trim() && searched && results.length === 0 && !loading ? (
        <p className="text-sm text-zinc-500">No movies found for that search.</p>
      ) : null}

      {results.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {results.slice(0, 16).map((item) => {
            const title = item.title || item.name || "Untitled";
            const itemYear = (item.release_date || item.first_air_date || "").slice(
              0,
              4,
            );
            const isSelected = String(item.id) === movie?.id;
            const posterUrl = poster(item.poster_path);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect({ id: String(item.id), title })}
                aria-pressed={isSelected}
                className={`group relative overflow-hidden rounded-xl border text-left transition ${
                  isSelected
                    ? "border-red-500 ring-2 ring-red-500/40"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="relative aspect-[2/3] w-full bg-zinc-900">
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-600">
                      {title}
                    </div>
                  )}
                  {isSelected ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                        Selected
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-white">
                    {title}
                  </p>
                  {itemYear ? (
                    <p className="text-[11px] text-zinc-500">{itemYear}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {movie ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Ready to start
          </p>
          <p className="text-sm font-bold text-white">
            {movie.title || (selected?.title ?? "")}
          </p>
          {year ? <p className="text-xs text-zinc-500">{year}</p> : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
          <p className="text-sm text-zinc-500">
            Search above and pick the movie everyone will watch.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onCreate}
          disabled={!canCreate || creating}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Creating room...
            </>
          ) : (
            "Create cinema room"
          )}
        </button>
      </div>
    </div>
  );
}
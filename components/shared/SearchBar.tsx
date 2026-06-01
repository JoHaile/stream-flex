"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import type { SearchResultItem } from "@/utils/catalog";

function tmdbImage(path: string | null | undefined, size = "w92") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
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
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    setQuery("");
    setOpen(false);
    const path =
      item.media_type === "tv"
        ? `/tv-series/${item.id}`
        : `/movies/${item.id}`;
    router.push(path);
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          placeholder="Search movies & TV series..."
          className="w-full rounded bg-zinc-800 py-2 pl-10 pr-8 text-sm text-zinc-200 placeholder-zinc-500 ring-1 ring-zinc-700 focus:outline-none focus:ring-red-500"
        />
        {query ? (
          <button
            onClick={clearQuery}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}
        {loading ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
          </div>
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 max-h-[400px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl z-50"
        >
          {results.slice(0, 8).map((item) => {
            const title = item.title || item.name || "Untitled";
            const year = (item.release_date || item.first_air_date || "").slice(
              0,
              4,
            );
            const poster = tmdbImage(item.poster_path);
            return (
              <button
                key={`${item.media_type}-${item.id}`}
                onClick={() => handleSelect(item)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 transition"
              >
                <div className="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={title}
                      width={32}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                      N/A
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {year ? <span>{year}</span> : null}
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">
                      {item.media_type === "tv" ? "TV" : "Movie"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

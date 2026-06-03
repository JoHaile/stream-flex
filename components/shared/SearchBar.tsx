"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import type { SearchResultItem } from "@/utils/catalog";
import {
  Combobox,
  ComboboxClear,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopup,
} from "@/components/ui/combobox";

function tmdbImage(path: string | null | undefined, size = "w92") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (item: SearchResultItem) => {
    const path =
      item.media_type === "tv"
        ? `/tv-series/${item.id}`
        : `/movies/${item.id}`;
    setQuery("");
    setResults([]);
    router.push(path);
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Combobox<SearchResultItem>
        inputValue={query}
        onInputValueChange={(value) => setQuery(value)}
        filteredItems={results}
        filter={null}
        itemToStringLabel={(item) => item.title || item.name || ""}
        isItemEqualToValue={(a, b) =>
          a.media_type === b.media_type && a.id === b.id
        }
        open={query.trim().length > 0}
      >
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          <ComboboxInput
            placeholder="Search movies & TV series..."
            className="w-full rounded bg-zinc-800 py-2 pl-10 pr-8 text-sm text-zinc-200 placeholder-zinc-500 ring-1 ring-zinc-700 focus-visible:ring-red-500"
          />
          {loading ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
            </div>
          ) : query ? (
            <ComboboxClear
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              aria-label="Clear search"
            >
              <XIcon className="h-4 w-4" />
            </ComboboxClear>
          ) : null}
        </div>

        <ComboboxPopup className="max-h-[400px] bg-zinc-900 text-zinc-200 ring-zinc-700">
          {results.length === 0 ? (
            <ComboboxEmpty className="text-zinc-500">
              {loading ? "Searching..." : "No results found"}
            </ComboboxEmpty>
          ) : (
            results.slice(0, 8).map((item, index) => {
              const title = item.title || item.name || "Untitled";
              const year = (
                item.release_date ||
                item.first_air_date ||
                ""
              ).slice(0, 4);
              const poster = tmdbImage(item.poster_path);
              return (
                <ComboboxItem
                  key={`${item.media_type}-${item.id}`}
                  value={item}
                  index={index}
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 focus:bg-zinc-800 rounded-none"
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
                </ComboboxItem>
              );
            })
          )}
        </ComboboxPopup>
      </Combobox>
    </div>
  );
}

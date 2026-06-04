"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { SearchResultItem } from "@/utils/catalog";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

function tmdbImage(path: string | null | undefined, size = "w92") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

interface SearchCommandProps {
  triggerClassName?: string;
}

export default function SearchCommand({
  triggerClassName,
}: SearchCommandProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const handleSelect = (item: SearchResultItem) => {
    setOpen(false);
    router.push(
      item.media_type === "tv"
        ? `/tv-series/${item.id}`
        : `/movies/${item.id}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
        }
        aria-label="Search"
      >
        <SearchIcon className="w-5 h-5 text-zinc-400" />
      </button>
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-0 sm:max-w-lg overflow-hidden bg-zinc-900 ring-zinc-700"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command
          shouldFilter={false}
          label="Search movies and TV series"
          className="bg-zinc-900 text-zinc-200"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search movies & TV series..."
            className="h-11 text-base text-zinc-200 placeholder:text-zinc-500"
          />
          <CommandList className="max-h-[60vh] min-h-[120px]">
            {loading ? (
              <CommandLoading>Searching...</CommandLoading>
            ) : query.trim() && results.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : !query.trim() ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                Type to search for movies and TV series.
              </div>
            ) : (
              results.slice(0, 8).map((item) => {
                const title = item.title || item.name || "Untitled";
                const year = (
                  item.release_date ||
                  item.first_air_date ||
                  ""
                ).slice(0, 4);
                const poster = tmdbImage(item.poster_path);
                const value = `${item.media_type}-${item.id}`;
                return (
                  <CommandItem
                    key={value}
                    value={value}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2.5 text-zinc-200 data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white"
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
                    <div className="flex flex-1 flex-col min-w-0">
                      <span className="truncate text-sm font-medium">
                        {title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        {year ? <span>{year}</span> : null}
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">
                          {item.media_type === "tv" ? "TV" : "Movie"}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                );
              })
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

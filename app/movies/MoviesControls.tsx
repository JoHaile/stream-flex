"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import SearchBar from "@/components/shared/SearchBar";
import type { CatalogSort, SelectOption } from "@/utils/catalog";

type Props = {
  defaultGenre: string;
  defaultSort: CatalogSort;
  defaultYear: string;
  defaultAvailability: string;
  genreOptions: SelectOption[];
  pathname: string;
  sortOptions: SelectOption[];
  totalResults: number;
  yearOptions: SelectOption[];
  availabilityOptions: SelectOption[];
};

export default function MoviesControls({
  defaultGenre,
  defaultSort,
  defaultYear,
  defaultAvailability,
  genreOptions,
  pathname,
  sortOptions,
  totalResults,
  yearOptions,
  availabilityOptions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentGenre = searchParams.get("genre") || defaultGenre;
  const currentSort = searchParams.get("sort") || defaultSort;
  const currentYear = searchParams.get("year") || defaultYear;
  const currentAvailability =
    searchParams.get("availability") || defaultAvailability;

  const updateQuery = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || (name === "sort" && value === "default")) {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    params.delete("page");
    const href = params.toString() ? `${pathname}?${params}` : pathname;
    startTransition(() => router.push(href, { scroll: false }));
  };

  const resetFilters = () => {
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  const hasActiveFilters =
    currentGenre || currentSort !== "default" || currentYear || currentAvailability;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SearchBar />
        <span className="text-sm font-semibold text-zinc-400 whitespace-nowrap">
          {totalResults.toLocaleString()} movies
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={currentGenre || "all"}
              onChange={(e) => updateQuery("genre", e.target.value)}
              className="appearance-none rounded bg-zinc-800 px-3 py-1.5 pr-8 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 focus:outline-none focus:ring-red-500 cursor-pointer"
            >
              <option value="all">All Genres</option>
              {genreOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={currentYear || "all"}
              onChange={(e) => updateQuery("year", e.target.value)}
              className="appearance-none rounded bg-zinc-800 px-3 py-1.5 pr-8 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 focus:outline-none focus:ring-red-500 cursor-pointer"
            >
              <option value="all">Any Year</option>
              {yearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={currentAvailability || "all"}
              onChange={(e) => updateQuery("availability", e.target.value)}
              className="appearance-none rounded bg-zinc-800 px-3 py-1.5 pr-8 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 focus:outline-none focus:ring-red-500 cursor-pointer"
            >
              {availabilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              disabled={isPending}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-700 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50"
            >
              Reset
            </button>
          ) : null}
        </div>

        <div className="relative ml-auto">
          <select
            value={currentSort}
            onChange={(e) => updateQuery("sort", e.target.value)}
            className="appearance-none rounded bg-zinc-800 px-3 py-1.5 pr-8 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 focus:outline-none focus:ring-red-500 cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

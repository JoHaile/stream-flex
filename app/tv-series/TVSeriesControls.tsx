"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { CatalogSort, SelectOption } from "@/utils/catalog";

type Props = {
  defaultGenre: string;
  defaultSort: CatalogSort;
  defaultYear: string;
  genreOptions: SelectOption[];
  pathname: string;
  sortOptions: SelectOption[];
  totalResults: number;
  yearOptions: SelectOption[];
};

export default function TVSeriesControls({
  defaultGenre,
  defaultSort,
  defaultYear,
  genreOptions,
  pathname,
  sortOptions,
  totalResults,
  yearOptions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentGenre = searchParams.get("genre") || defaultGenre;
  const currentSort = searchParams.get("sort") || defaultSort;
  const currentYear = searchParams.get("year") || defaultYear;

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

  const hasActiveFilters = currentGenre || currentSort !== "default" || currentYear;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-zinc-400">
            {totalResults.toLocaleString()} series
          </span>

          <div className="flex flex-wrap gap-2">
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
        </div>
      </div>
    </div>
  );
}

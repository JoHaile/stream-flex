"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { CatalogSort, SelectOption } from "@/utils/catalog";
import { FilterSelect } from "@/components/shared/FilterSelect";

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

export default function TVSeriesControls({
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

  const genreSelectOptions: SelectOption[] = [
    { value: "all", label: "All Genres" },
    ...genreOptions,
  ];

  const yearSelectOptions: SelectOption[] = [
    { value: "all", label: "Any Year" },
    ...yearOptions,
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="text-sm font-semibold text-zinc-400 whitespace-nowrap pb-[3px]">
            {totalResults.toLocaleString()} series
          </span>

          <FilterSelect
            label="Genre"
            value={currentGenre || "all"}
            onValueChange={(value) => updateQuery("genre", value)}
            options={genreSelectOptions}
            ariaLabel="Filter by genre"
          />

          <FilterSelect
            label="Year"
            value={currentYear || "all"}
            onValueChange={(value) => updateQuery("year", value)}
            options={yearSelectOptions}
            ariaLabel="Filter by year"
          />

          <FilterSelect
            label="Availability"
            value={currentAvailability || "all"}
            onValueChange={(value) => updateQuery("availability", value)}
            options={availabilityOptions}
            ariaLabel="Filter by availability"
          />

          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              disabled={isPending}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-700 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50 mb-[3px]"
            >
              Reset
            </button>
          ) : null}
        </div>

        <FilterSelect
          label="Sort"
          value={currentSort}
          onValueChange={(value) => updateQuery("sort", value)}
          options={sortOptions}
          ariaLabel="Sort results"
        />
      </div>
    </div>
  );
}

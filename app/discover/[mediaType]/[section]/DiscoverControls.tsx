"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { CatalogSort, SelectOption } from "@/utils/catalog";
import { FilterSelect } from "@/components/shared/FilterSelect";

type Props = {
  defaultGenre: string;
  defaultSort: CatalogSort;
  defaultYear: string;
  defaultType?: string;
  genreOptions: SelectOption[];
  mediaTypeOptions?: SelectOption[];
  pathname: string;
  sortOptions: SelectOption[];
  totalResults: number;
  yearOptions: SelectOption[];
};

export default function DiscoverControls({
  defaultGenre,
  defaultSort,
  defaultYear,
  defaultType,
  genreOptions,
  mediaTypeOptions,
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
  const currentType = searchParams.get("type") || defaultType || "all";

  const updateQuery = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all" || (name === "sort" && value === "default")) {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    if (name === "type" && value !== currentType) {
      params.delete("genre");
    }

    params.delete("page");
    const href = params.toString() ? `${pathname}?${params}` : pathname;
    startTransition(() => router.push(href, { scroll: false }));
  };

  const resetFilters = () => {
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  const hasActiveFilters =
    currentGenre || currentSort !== "default" || currentYear || currentType !== "all";

  const genreSelectOptions: SelectOption[] = [
    { value: "all", label: "All Genres" },
    ...genreOptions,
  ];

  const yearSelectOptions: SelectOption[] = [
    { value: "all", label: "Any Year" },
    ...yearOptions,
  ];

  const typeLabel =
    totalResults === 1
      ? `${totalResults.toLocaleString()} title`
      : `${totalResults.toLocaleString()} titles`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-400 whitespace-nowrap">
            {typeLabel}
          </span>

          {mediaTypeOptions?.length ? (
            <FilterSelect
              value={currentType}
              onValueChange={(value) => updateQuery("type", value)}
              options={mediaTypeOptions}
              ariaLabel="Filter by type"
            />
          ) : null}

          <FilterSelect
            value={currentSort}
            onValueChange={(value) => updateQuery("sort", value)}
            options={sortOptions}
            ariaLabel="Sort results"
          />

          <FilterSelect
            value={currentGenre || "all"}
            onValueChange={(value) => updateQuery("genre", value)}
            options={genreSelectOptions}
            ariaLabel="Filter by genre"
          />

          <FilterSelect
            value={currentYear || "all"}
            onValueChange={(value) => updateQuery("year", value)}
            options={yearSelectOptions}
            ariaLabel="Filter by year"
          />

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
  );
}

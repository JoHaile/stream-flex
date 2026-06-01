"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogSort, SelectOption } from "@/utils/catalog";

type Props = {
  defaultType?: string;
  genreOptions: SelectOption[];
  mediaTypeOptions?: SelectOption[];
  selectedGenre: string;
  selectedSort: CatalogSort;
  selectedType?: string;
  selectedYear: string;
  sortOptions: SelectOption[];
  yearOptions: SelectOption[];
};

export default function CatalogControls({
  defaultType = "all",
  genreOptions,
  mediaTypeOptions,
  selectedGenre,
  selectedSort,
  selectedType = "all",
  selectedYear,
  sortOptions,
  yearOptions,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateQuery = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all" || (name === "sort" && value === "default")) {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    if (name === "type" && value !== selectedType) {
      params.delete("genre");
    }

    params.delete("page");

    const nextHref = params.toString() ? `${pathname}?${params}` : pathname;

    startTransition(() => {
      router.push(nextHref, { scroll: false });
    });
  };

  const resetFilters = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  return (
    <div className="rounded-[28px] border border-border bg-card p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {mediaTypeOptions?.length ? (
          <FilterSelect
            label="Type"
            options={mediaTypeOptions}
            value={selectedType || defaultType}
            onChange={(value) => updateQuery("type", value ?? defaultType)}
          />
        ) : null}

        <FilterSelect
          label="Sort"
          options={sortOptions}
          value={selectedSort}
          onChange={(value) => updateQuery("sort", value ?? "default")}
        />

        <FilterSelect
          label="Genre"
          options={[{ label: "All genres", value: "all" }, ...genreOptions]}
          value={selectedGenre || "all"}
          onChange={(value) => updateQuery("genre", value ?? "all")}
        />

        <FilterSelect
          label="Year"
          options={[{ label: "Any year", value: "all" }, ...yearOptions]}
          value={selectedYear || "all"}
          onChange={(value) => updateQuery("year", value ?? "all")}
        />

        <div className="flex items-center gap-2 md:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={isPending}
            className="border-border bg-muted text-foreground hover:bg-accent"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  value: string;
}) {
  return (
    <div className="min-w-[180px] flex-1 md:flex-none">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border-border bg-muted text-foreground hover:bg-accent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border border-border bg-card text-foreground">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

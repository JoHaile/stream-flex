"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  LoaderCircleIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CatalogSort, SelectOption } from "@/utils/catalog";

type FilterField = {
  ariaLabel: string;
  clearValue: string;
  label: string;
  name: string;
  options: SelectOption[];
  resetParams?: string[];
  value: string;
};

type Props = {
  availabilityOptions?: SelectOption[];
  className?: string;
  defaultAvailability?: string;
  defaultGenre?: string;
  defaultSort: CatalogSort;
  defaultType?: string;
  defaultYear?: string;
  genreOptions: SelectOption[];
  mediaTypeOptions?: SelectOption[];
  pathname?: string;
  resultLabel?: string;
  sortOptions: SelectOption[];
  totalResults?: number;
  yearOptions: SelectOption[];
};

export default function CatalogControls({
  availabilityOptions,
  className,
  defaultAvailability = "all",
  defaultGenre = "all",
  defaultSort,
  defaultType = "all",
  defaultYear = "all",
  genreOptions,
  mediaTypeOptions,
  pathname,
  resultLabel,
  sortOptions,
  totalResults,
  yearOptions,
}: Props) {
  const currentPathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const targetPathname = pathname ?? currentPathname;

  const fields: FilterField[] = [
    ...(mediaTypeOptions?.length
      ? [
          {
            ariaLabel: "Filter by type",
            clearValue: "all",
            label: "Type",
            name: "type",
            options: mediaTypeOptions,
            resetParams: ["genre"],
            value: searchParams.get("type") || defaultType || "all",
          },
        ]
      : []),
    {
      ariaLabel: "Filter by genre",
      clearValue: "all",
      label: "Genre",
      name: "genre",
      options: [{ label: "All genres", value: "all" }, ...genreOptions],
      value: searchParams.get("genre") || defaultGenre || "all",
    },
    {
      ariaLabel: "Filter by year",
      clearValue: "all",
      label: "Year",
      name: "year",
      options: [{ label: "Any year", value: "all" }, ...yearOptions],
      value: searchParams.get("year") || defaultYear || "all",
    },
    ...(availabilityOptions?.length
      ? [
          {
            ariaLabel: "Filter by availability",
            clearValue: "all",
            label: "Availability",
            name: "availability",
            options: availabilityOptions,
            value:
              searchParams.get("availability") ||
              defaultAvailability ||
              "all",
          },
        ]
      : []),
    {
      ariaLabel: "Sort results",
      clearValue: "default",
      label: "Sort",
      name: "sort",
      options: sortOptions,
      value: searchParams.get("sort") || defaultSort || "default",
    },
  ];

  const activeFilters = fields
    .filter((field) => field.value && field.value !== field.clearValue)
    .map((field) => ({
      label: field.label,
      value:
        field.options.find((option) => option.value === field.value)?.label ??
        field.value,
    }));
  const activeFilterCount = activeFilters.length;
  const summaryLabel =
    resultLabel ??
    (typeof totalResults === "number"
      ? `${totalResults.toLocaleString()} results`
      : "Catalog results");

  const pushParams = (params: URLSearchParams) => {
    const queryString = params.toString();
    const nextHref = queryString ? `${targetPathname}?${queryString}` : targetPathname;

    startTransition(() => {
      router.push(nextHref, { scroll: false });
    });
  };

  const updateQuery = (field: FilterField, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === field.clearValue) {
      params.delete(field.name);
    } else {
      params.set(field.name, value);
    }

    if (value !== field.value) {
      field.resetParams?.forEach((param) => params.delete(param));
    }

    params.delete("page");
    pushParams(params);
  };

  const resetFilters = () => {
    startTransition(() => {
      router.push(targetPathname, { scroll: false });
    });
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/75 p-4 text-white shadow-2xl shadow-black/35 ring-1 ring-white/5 backdrop-blur-xl sm:p-5",
        isPending && "opacity-90",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-500">
            <SlidersHorizontalIcon className="size-3.5" />
            Filters
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white sm:text-base">
              {summaryLabel}
            </p>
            {activeFilterCount ? (
              <span className="rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200">
                {activeFilterCount} active
              </span>
            ) : null}
          </div>
        </div>

        <MobileFilterDrawer
          activeFilterCount={activeFilterCount}
          fields={fields}
          isPending={isPending}
          onReset={resetFilters}
          onUpdate={updateQuery}
          summaryLabel={summaryLabel}
        />
      </div>

      <div className="mt-4 hidden items-end gap-3 lg:flex">
        <div className="grid flex-1 grid-cols-4 gap-3 xl:grid-cols-5">
          {fields.map((field) => (
            <CatalogFilterSelect
              key={field.name}
              field={field}
              onChange={updateQuery}
            />
          ))}
        </div>

        {activeFilterCount ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={resetFilters}
            disabled={isPending}
            className="h-10 border-zinc-700 bg-zinc-900/80 px-3 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RotateCcwIcon className="size-4" />
            Reset
          </Button>
        ) : null}
      </div>

      {activeFilters.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {activeFilters.map((filter) => (
            <span
              key={`${filter.label}-${filter.value}`}
              className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300"
            >
              {filter.label}: {filter.value}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CatalogFilterSelect({
  field,
  isMobile = false,
  onChange,
}: {
  field: FilterField;
  isMobile?: boolean;
  onChange: (field: FilterField, value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {field.label}
      </label>
      <Select
        value={field.value}
        onValueChange={(value) => onChange(field, value ?? field.clearValue)}
      >
        <SelectTrigger
          size="sm"
          aria-label={field.ariaLabel}
          className={cn(
            "w-full border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 shadow-inner shadow-black/20 hover:bg-zinc-800 focus-visible:border-red-500/50 focus-visible:ring-red-500/20 data-[size=sm]:h-10",
            isMobile && "data-[size=sm]:h-11",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[60] border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-2xl">
          {field.options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-sm focus:bg-red-500/15 focus:text-white"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MobileFilterDrawer({
  activeFilterCount,
  fields,
  isPending,
  onReset,
  onUpdate,
  summaryLabel,
}: {
  activeFilterCount: number;
  fields: FilterField[];
  isPending: boolean;
  onReset: () => void;
  onUpdate: (field: FilterField, value: string) => void;
  summaryLabel: string;
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0 border-zinc-700 bg-zinc-900/80 px-3 text-white hover:bg-zinc-800 lg:hidden"
          aria-label="Open filters"
        >
          {isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <SlidersHorizontalIcon className="size-4" />
          )}
          Filters
          {activeFilterCount ? (
            <span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-zinc-800 bg-zinc-950 text-white">
        <DrawerHeader className="flex-row items-start justify-between gap-4 text-left">
          <div>
            <DrawerTitle className="text-white">Filters</DrawerTitle>
            <DrawerDescription className="text-zinc-400">
              {summaryLabel}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Close filters"
            >
              <XIcon className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto px-4 pb-4">
          {fields.map((field) => (
            <CatalogFilterSelect
              key={field.name}
              field={field}
              isMobile
              onChange={onUpdate}
            />
          ))}
        </div>

        <DrawerFooter className="border-t border-zinc-800">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={!activeFilterCount || isPending}
              className="h-10 border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
              <RotateCcwIcon className="size-4" />
              Reset filters
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

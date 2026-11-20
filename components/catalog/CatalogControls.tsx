"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import {
  ArrowUpDownIcon,
  CalendarIcon,
  ClapperboardIcon,
  GlobeIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  ShapesIcon,
  SlidersHorizontalIcon,
  TagIcon,
  XIcon,
  type LucideProps,
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

type ExtraField = {
  ariaLabel: string;
  clearValue: string;
  defaultValue?: string;
  label: string;
  name: string;
  options: SelectOption[];
};

type FilterField = {
  ariaLabel: string;
  clearValue: string;
  icon: ComponentType<LucideProps>;
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
  extraFields?: ExtraField[];
  genreOptions?: SelectOption[];
  mediaTypeOptions?: SelectOption[];
  pathname?: string;
  resultLabel?: string;
  sortOptions: SelectOption[];
  totalResults?: number;
  yearOptions: SelectOption[];
};

const FIELD_ICONS: Record<string, ComponentType<LucideProps>> = {
  availability: ClapperboardIcon,
  format: ShapesIcon,
  genre: TagIcon,
  origin: GlobeIcon,
  sort: ArrowUpDownIcon,
  type: ShapesIcon,
  year: CalendarIcon,
};

// Static class strings so Tailwind keeps them; the row is only balanced when the
// grid column count matches the number of filters a page actually renders.
const PILL_GRID_COLUMNS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-3 xl:grid-cols-5",
  6: "lg:grid-cols-3 xl:grid-cols-6",
};

export default function CatalogControls({
  availabilityOptions,
  className,
  defaultAvailability = "all",
  defaultGenre = "all",
  defaultSort,
  defaultType = "all",
  defaultYear = "all",
  extraFields,
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
            icon: FIELD_ICONS.type,
            label: "Type",
            name: "type",
            options: mediaTypeOptions,
            resetParams: ["genre"],
            value: searchParams.get("type") || defaultType || "all",
          },
        ]
      : []),
    ...(genreOptions?.length
      ? [
          {
            ariaLabel: "Filter by genre",
            clearValue: "all",
            icon: FIELD_ICONS.genre,
            label: "Genre",
            name: "genre",
            options: [{ label: "All genres", value: "all" }, ...genreOptions],
            value: searchParams.get("genre") || defaultGenre || "all",
          },
        ]
      : []),
    ...(extraFields?.length
      ? extraFields.map((field) => ({
          ariaLabel: field.ariaLabel,
          clearValue: field.clearValue,
          icon: FIELD_ICONS[field.name] ?? SlidersHorizontalIcon,
          label: field.label,
          name: field.name,
          options: field.options,
          value:
            searchParams.get(field.name) ||
            field.defaultValue ||
            field.clearValue,
        }))
      : []),
    {
      ariaLabel: "Filter by year",
      clearValue: "all",
      icon: FIELD_ICONS.year,
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
            icon: FIELD_ICONS.availability,
            label: "Availability",
            name: "availability",
            options: availabilityOptions,
            value:
              searchParams.get("availability") || defaultAvailability || "all",
          },
        ]
      : []),
    {
      ariaLabel: "Sort results",
      clearValue: "default",
      icon: FIELD_ICONS.sort,
      label: "Sort",
      name: "sort",
      options: sortOptions,
      value: searchParams.get("sort") || defaultSort || "default",
    },
  ];

  const activeFilters = fields
    .filter((field) => field.value && field.value !== field.clearValue)
    .map((field) => ({
      field,
      label: field.label,
      value:
        field.options.find((option) => option.value === field.value)?.label ??
        field.value,
    }));
  const activeFilterCount = activeFilters.length;
  const pillGridColumns =
    PILL_GRID_COLUMNS[fields.length] ?? PILL_GRID_COLUMNS[5];
  const summaryLabel =
    resultLabel ??
    (typeof totalResults === "number"
      ? `${totalResults.toLocaleString()} results`
      : "Catalog results");

  const pushParams = (params: URLSearchParams) => {
    const queryString = params.toString();
    const nextHref = queryString
      ? `${targetPathname}?${queryString}`
      : targetPathname;

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
    const params = new URLSearchParams(searchParams.toString());
    // Keep an active category search; "Reset" only clears the filters.
    const search = params.get("search");
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    pushParams(next);
  };

  return (
    <section
      className={cn("relative text-white", isPending && "opacity-90", className)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-zinc-950/70 shadow-xl shadow-black/30 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10">
              <SlidersHorizontalIcon className="size-3.5 text-zinc-300" />
            </span>
            <p className="truncate text-xs font-medium text-zinc-300">
              {summaryLabel}
            </p>
            {activeFilterCount ? (
              <span className="hidden shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 sm:inline">
                {activeFilterCount} active
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {activeFilterCount ? (
              <button
                type="button"
                onClick={resetFilters}
                disabled={isPending}
                className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white sm:flex"
              >
                <RotateCcwIcon className="size-3" />
                Reset
              </button>
            ) : null}

            <MobileFilterDrawer
              activeFilterCount={activeFilterCount}
              fields={fields}
              isPending={isPending}
              onReset={resetFilters}
              onUpdate={updateQuery}
              summaryLabel={summaryLabel}
            />
          </div>
        </div>

        {/* Below lg the "Filters" button opens a drawer holding every field, so the
            inline pills would just duplicate them on a narrow screen. */}
        <div
          className={cn(
            "hidden gap-2 px-3 py-3 sm:px-4 lg:grid",
            pillGridColumns,
          )}
        >
          {fields.map((field) => (
            <div key={field.name} className="w-full">
              <CatalogFilterPill field={field} onChange={updateQuery} />
            </div>
          ))}
        </div>

        {activeFilters.length ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 px-3 py-2.5 sm:px-4">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Active
            </span>
            {activeFilters.map(({ field, label, value }) => (
              <button
                key={`${field.name}-${value}`}
                type="button"
                onClick={() => updateQuery(field, field.clearValue)}
                title={`Clear ${label}`}
                className="group/chip inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-2.5 pr-1.5 text-xs text-zinc-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white"
              >
                <span className="text-zinc-500 group-hover/chip:text-red-300">
                  {label}
                </span>
                {value}
                <XIcon className="size-3 text-zinc-500 group-hover/chip:text-white" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CatalogFilterPill({
  field,
  isMobile = false,
  onChange,
  portalContainer,
}: {
  field: FilterField;
  isMobile?: boolean;
  onChange: (field: FilterField, value: string) => void;
  /** Dialog the options must live in to stay clickable (see SelectContent). */
  portalContainer?: HTMLElement | null;
}) {
  const isActive = field.value !== field.clearValue;
  const Icon = field.icon;
  const optionLabel = (value: string) =>
    field.options.find((option) => option.value === value)?.label ?? value;

  return (
    <Select
      value={field.value}
      onValueChange={(value) => onChange(field, value ?? field.clearValue)}
    >
      <SelectTrigger
        aria-label={field.ariaLabel}
        className={cn(
          "group flex w-full items-center gap-2 rounded-full border px-3 py-2 text-xs transition",
          "data-[size=default]:h-9 data-[size=sm]:h-9",
          isMobile && "h-11 rounded-xl text-sm",
          isActive
            ? "border-red-500/40 bg-red-500/10 text-white hover:bg-red-500/15"
            : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/20 hover:bg-white/[0.08]",
        )}
      >
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            isActive ? "text-red-300" : "text-zinc-500",
          )}
        />
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 md:inline">
          {field.label}
        </span>
        <SelectValue className="min-w-0 flex-1 truncate text-left font-medium text-white">
          {(value) => optionLabel(typeof value === "string" ? value : field.value)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        container={portalContainer}
        className="z-[60] rounded-xl border border-white/10 bg-zinc-950/95 text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        {field.options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-lg text-sm focus:bg-red-500/15 focus:text-white"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  // The drawer is modal, so the page behind it ignores pointer events. Options
  // portalled to <body> would render but swallow no clicks, so they are
  // portalled into the drawer itself.
  const [drawerEl, setDrawerEl] = useState<HTMLDivElement | null>(null);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-9 gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Open filters"
        >
          {isPending ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <SlidersHorizontalIcon className="size-3.5" />
          )}
          Filters
          {activeFilterCount ? (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </DrawerTrigger>
      <DrawerContent
        ref={setDrawerEl}
        className="border-white/10 bg-zinc-950 text-white"
      >
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
              className="text-zinc-400 hover:bg-white/10 hover:text-white"
              aria-label="Close filters"
            >
              <XIcon className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="grid max-h-[55vh] gap-4 overflow-y-auto px-4 pb-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {field.label}
              </label>
              <CatalogFilterPill
                field={field}
                isMobile
                onChange={onUpdate}
                portalContainer={drawerEl}
              />
            </div>
          ))}
        </div>

        <DrawerFooter className="border-t border-white/10">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={!activeFilterCount || isPending}
              className="h-10 rounded-full border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/10 hover:text-white"
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

import CatalogControls from "@/components/catalog/CatalogControls";
import type { AnimeFormat, AnimeOrigin, CatalogSort, SelectOption } from "@/utils/catalog";

export const animeFormatOptions: SelectOption[] = [
  { label: "All formats", value: "all" },
  { label: "Movies", value: "movie" },
  { label: "Series", value: "tv" },
];

export const animeOriginOptions: SelectOption[] = [
  { label: "All animation", value: "all" },
  { label: "Anime (Japanese)", value: "anime" },
  { label: "Western animation", value: "english" },
];

type Props = {
  defaultFormat: AnimeFormat;
  defaultOrigin: AnimeOrigin;
  defaultSort: CatalogSort;
  defaultYear: string;
  pathname: string;
  sortOptions: SelectOption[];
  totalResults: number;
  yearOptions: SelectOption[];
};

export default function AnimeControls({
  defaultFormat,
  defaultOrigin,
  defaultSort,
  defaultYear,
  pathname,
  sortOptions,
  totalResults,
  yearOptions,
}: Props) {
  return (
    <CatalogControls
      defaultSort={defaultSort}
      defaultYear={defaultYear}
      extraFields={[
        {
          ariaLabel: "Filter by format",
          clearValue: "all",
          defaultValue: defaultFormat,
          label: "Format",
          name: "format",
          options: animeFormatOptions,
        },
        {
          ariaLabel: "Filter by origin",
          clearValue: "all",
          defaultValue: defaultOrigin,
          label: "Origin",
          name: "origin",
          options: animeOriginOptions,
        },
      ]}
      pathname={pathname}
      resultLabel={`${totalResults.toLocaleString()} animated titles`}
      sortOptions={sortOptions}
      totalResults={totalResults}
      yearOptions={yearOptions}
    />
  );
}

import CatalogControls from "@/components/catalog/CatalogControls";
import type { CatalogSort, SelectOption } from "@/utils/catalog";

type Props = {
  availabilityOptions: SelectOption[];
  defaultAvailability: string;
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
  availabilityOptions,
  defaultAvailability,
  defaultGenre,
  defaultSort,
  defaultYear,
  genreOptions,
  pathname,
  sortOptions,
  totalResults,
  yearOptions,
}: Props) {
  return (
    <CatalogControls
      availabilityOptions={availabilityOptions}
      defaultAvailability={defaultAvailability}
      defaultGenre={defaultGenre}
      defaultSort={defaultSort}
      defaultYear={defaultYear}
      genreOptions={genreOptions}
      pathname={pathname}
      resultLabel={`${totalResults.toLocaleString()} series`}
      sortOptions={sortOptions}
      totalResults={totalResults}
      yearOptions={yearOptions}
    />
  );
}

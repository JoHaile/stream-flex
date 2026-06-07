import CatalogControls from "@/components/catalog/CatalogControls";
import type { CatalogSort, SelectOption } from "@/utils/catalog";

type Props = {
  defaultGenre: string;
  defaultSort: CatalogSort;
  defaultType?: string;
  defaultYear: string;
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
  defaultType,
  defaultYear,
  genreOptions,
  mediaTypeOptions,
  pathname,
  sortOptions,
  totalResults,
  yearOptions,
}: Props) {
  const resultNoun = totalResults === 1 ? "title" : "titles";

  return (
    <CatalogControls
      defaultGenre={defaultGenre}
      defaultSort={defaultSort}
      defaultType={defaultType}
      defaultYear={defaultYear}
      genreOptions={genreOptions}
      mediaTypeOptions={mediaTypeOptions}
      pathname={pathname}
      resultLabel={`${totalResults.toLocaleString()} ${resultNoun}`}
      sortOptions={sortOptions}
      totalResults={totalResults}
      yearOptions={yearOptions}
    />
  );
}

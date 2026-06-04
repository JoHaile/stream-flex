import Link from "next/link";

type Props = {
  currentPage: number;
  pathname: string;
  query: Record<string, string | undefined>;
  totalPages: number;
};

export default function Pagination({
  currentPage,
  pathname,
  query,
  totalPages,
}: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <nav className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={buildHref(pathname, query, Math.max(1, currentPage - 1))}
        scroll={false}
        className={`flex h-9 items-center rounded px-3 text-sm font-medium transition ${
          currentPage === 1
            ? "pointer-events-none bg-zinc-800/50 text-zinc-600"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </Link>

      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-zinc-500"
          >
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(pathname, query, page)}
            scroll={false}
            className={`flex h-9 w-9 items-center justify-center rounded text-sm font-medium transition ${
              page === currentPage
                ? "bg-red-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {page}
          </Link>
        ),
      )}

      <Link
        href={buildHref(pathname, query, Math.min(totalPages, currentPage + 1))}
        scroll={false}
        className={`flex h-9 items-center rounded px-3 text-sm font-medium transition ${
          currentPage === totalPages
            ? "pointer-events-none bg-zinc-800/50 text-zinc-600"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        Next
        <svg className="ml-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </nav>
  );
}

function buildHref(
  pathname: string,
  query: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (!value || value === "all" || key === "page") {
      continue;
    }
    params.set(key, value);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  return params.toString() ? `${pathname}?${params}` : pathname;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ] as const;
}

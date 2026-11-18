import { NextResponse } from "next/server";
import { getMultiSearch, getScopedSearch } from "@/utils/catalog";

const SCOPES = ["movie", "tv", "anime"] as const;

function isScope(value: string | null): value is (typeof SCOPES)[number] {
  return SCOPES.includes((value ?? "") as (typeof SCOPES)[number]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const scope = searchParams.get("scope");

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (isScope(scope)) {
      const data = await getScopedSearch({
        query: query.trim(),
        scope,
      });
      return NextResponse.json({ results: data.results });
    }

    const data = await getMultiSearch({ query: query.trim() });
    return NextResponse.json({ results: data?.results ?? [] });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}

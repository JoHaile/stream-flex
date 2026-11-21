import { NextResponse } from "next/server";
import { searchMultiRaw, searchScopedRaw } from "@/utils/catalog";

const SCOPES = ["movie", "tv", "anime"] as const;

function isScope(value: string | null): value is (typeof SCOPES)[number] {
  return SCOPES.includes((value ?? "") as (typeof SCOPES)[number]);
}

/** Search responses are per-query, so they must never be stored by the edge. */
function uncached(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const scope = searchParams.get("scope");

  if (!query || !query.trim()) {
    return uncached({ results: [] });
  }

  try {
    if (isScope(scope)) {
      const data = await searchScopedRaw({
        query: query.trim(),
        scope,
      });
      return uncached({ results: data.results });
    }

    const data = await searchMultiRaw({ query: query.trim() });
    return uncached({ results: data?.results ?? [] });
  } catch (err) {
    console.error("search API error", err);
    return uncached({ results: [], error: String(err) }, { status: 500 });
  }
}

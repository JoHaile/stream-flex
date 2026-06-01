import { NextResponse } from "next/server";
import { getMultiSearch } from "@/utils/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await getMultiSearch({ query: query.trim() });
    return NextResponse.json({ results: data?.results ?? [] });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}

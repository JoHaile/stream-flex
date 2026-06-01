"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import MediaCard from "./MediaCard";

const movieGenres: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

const tvGenres: Record<number, string> = {
  10759: "Action", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 10762: "Kids",
  9648: "Mystery", 10763: "News", 10764: "Reality", 10765: "Sci-Fi",
  10766: "Soap", 10767: "Talk", 10768: "War", 37: "Western",
};

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  genre_ids?: number[];
  vote_average?: number;
  number_of_seasons?: number;
}

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  mediaType?: "movie" | "tv";
  seeAllHref?: string;
}

export default function MediaRow({
  title,
  items,
  mediaType,
  seeAllHref,
}: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const getGenreName = (item: MediaItem): string | undefined => {
    if (!item.genre_ids || item.genre_ids.length === 0) return undefined;
    const type =
      mediaType || (item.media_type === "tv" ? "tv" : "movie");
    const genreMap = type === "tv" ? tvGenres : movieGenres;
    return genreMap[item.genre_ids[0]];
  };

  const getYear = (item: MediaItem): string | undefined => {
    const date = item.release_date || item.first_air_date;
    return date ? date.slice(0, 4) : undefined;
  };

  const getMediaType = (item: MediaItem): "movie" | "tv" => {
    if (mediaType) return mediaType;
    if (item.media_type === "tv") return "tv";
    return "movie";
  };

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="inline-flex items-center gap-1.5 rounded bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-white/90 transition"
            >
              See All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 scroll-smooth"
      >
        {items.map((item) => (
          <MediaCard
            key={item.id}
            id={item.id}
            title={item.title || item.name || "Untitled"}
            posterPath={item.poster_path || null}
            year={getYear(item)}
            mediaType={getMediaType(item)}
            genreName={getGenreName(item)}
            voteAverage={item.vote_average}
            seasonCount={item.number_of_seasons}
          />
        ))}
      </div>
    </section>
  );
}

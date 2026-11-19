"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import type { TMDBImageAsset } from "@/utils/tmdb";
import { cn } from "@/lib/utils";

type GalleryAsset = TMDBImageAsset & { file_path: string };

type MediaGalleryProps = {
  title: string;
  backdrops: TMDBImageAsset[];
  posters: TMDBImageAsset[];
};

function tmdbImage(path: string, size: string) {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

type GalleryItem = {
  path: string;
  // Size used for the thumbnail; the lightbox always loads the large version.
  thumbSize: string;
  fullSize: string;
  poster: boolean;
};

function GalleryTile({
  item,
  title,
  index,
  onOpen,
}: {
  item: GalleryItem;
  title: string;
  index: number;
  onOpen: (index: number) => void;
}) {
  // Skeleton shimmer until the thumbnail arrives, then a soft fade-in.
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`View ${title} ${item.poster ? "poster" : "still"} ${index + 1}`}
      className={`group relative h-48 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-500 md:h-64 ${
        item.poster ? "aspect-[2/3]" : "aspect-video"
      }`}
    >
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-800" />
      ) : null}
      <Image
        src={tmdbImage(item.path, item.thumbSize)}
        alt={`${title} ${item.poster ? "poster" : "still"}`}
        fill
        onLoad={() => setLoaded(true)}
        className={cn(
          "object-cover transition duration-500 group-hover:scale-105",
          loaded ? "opacity-100" : "opacity-0",
        )}
        sizes={item.poster ? "220px" : "480px"}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/70 bg-black/40 opacity-0 transition group-hover:opacity-100",
            !loaded && "hidden",
          )}
        >
          <Maximize2 className="h-4 w-4 text-white" />
        </div>
      </div>
      <span
        className={cn(
          "absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 opacity-0 transition group-hover:opacity-100",
          !loaded && "hidden",
        )}
      >
        {item.poster ? "Poster" : "Still"}
      </span>
    </button>
  );
}

export default function MediaGallery({
  title,
  backdrops,
  posters,
}: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Narrow to usable assets *before* building the shared index space, so the
  // lightbox offset stays exact even if TMDB ever returns a null file_path.
  const stills = backdrops.filter(
    (asset): asset is GalleryAsset => !!asset.file_path,
  );
  const artwork = posters.filter(
    (asset): asset is GalleryAsset => !!asset.file_path,
  );

  if (!stills.length && !artwork.length) return null;

  // One merged horizontal row: 16:9 stills first, then posters at the same
  // height. The lightbox walks this exact order.
  const items: GalleryItem[] = [
    ...stills.map((asset) => ({
      path: asset.file_path,
      thumbSize: "w780",
      fullSize: "w1280",
      poster: false,
    })),
    ...artwork.map((asset) => ({
      path: asset.file_path,
      thumbSize: "w342",
      fullSize: "original",
      poster: true,
    })),
  ];

  const scrollRow = (direction: "left" | "right") => {
    rowRef.current?.scrollBy({
      left: direction === "left" ? -600 : 600,
      behavior: "smooth",
    });
  };

  const current = lightboxIndex === null ? null : items[lightboxIndex];

  return (
    <>
      <section className="mb-10 border-t border-zinc-800 pt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-white">Gallery</h2>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-sm font-semibold text-zinc-400">
              {items.length}
            </span>
          </div>
          {items.length > 3 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollRow("left")}
                aria-label="Scroll gallery left"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollRow("right")}
                aria-label="Scroll gallery right"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar"
        >
          {items.map((item, i) => (
            <GalleryTile
              key={`${item.path}-${i}`}
              item={item}
              title={title}
              index={i}
              onOpen={setLightboxIndex}
            />
          ))}
        </div>
      </section>

      {current ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Stage: hugs the image on mobile, but has a fixed width on md+ so
                the prev/next arrows stay put no matter the image's aspect. */}
            <div className="relative flex items-center justify-center md:w-[min(88vw,90rem)]">
              <div className="relative">
                {loadedSrc !== current.path ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-[70vw] max-w-2xl animate-pulse rounded-xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-800 ring-1 ring-zinc-800" />
                  </div>
                ) : null}
                <Image
                  key={current.path}
                  src={tmdbImage(current.path, current.fullSize)}
                  alt={`${title} image ${lightboxIndex! + 1}`}
                  width={1280}
                  height={720}
                  priority
                  onLoad={() => setLoadedSrc(current.path)}
                  className={cn(
                    "h-auto w-auto max-h-[78vh] max-w-[88vw] rounded-xl bg-zinc-900 object-contain shadow-2xl ring-1 ring-zinc-700 transition-opacity duration-500",
                    loadedSrc === current.path ? "opacity-100" : "opacity-0",
                  )}
                />
                <button
                  onClick={() => setLightboxIndex(null)}
                  aria-label="Close image"
                  className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-zinc-600 transition hover:bg-zinc-700 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {lightboxIndex! > 0 ? (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex! - 1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 transition hover:bg-black/80 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
              {lightboxIndex! < items.length - 1 ? (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex! + 1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 transition hover:bg-black/80 backdrop-blur-sm"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === lightboxIndex
                      ? "w-6 bg-red-500"
                      : "w-1.5 bg-zinc-600 hover:bg-zinc-400"
                  }`}
                />
              ))}
              <span className="ml-2 text-xs text-zinc-500">
                {lightboxIndex! + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

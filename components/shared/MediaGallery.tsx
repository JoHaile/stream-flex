"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TMDBImageAsset } from "@/utils/tmdb";

type GalleryAsset = TMDBImageAsset & { file_path: string };

type MediaGalleryProps = {
  title: string;
  backdrops: TMDBImageAsset[];
  posters: TMDBImageAsset[];
};

function tmdbImage(path: string, size: string) {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export default function MediaGallery({
  title,
  backdrops,
  posters,
}: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const stillsRowRef = useRef<HTMLDivElement>(null);

  // Narrow to usable assets *before* building the shared index space, so the
  // artwork offset stays exact even if TMDB ever returns a null file_path.
  const stills = backdrops.filter(
    (asset): asset is GalleryAsset => !!asset.file_path,
  );
  const artwork = posters.filter(
    (asset): asset is GalleryAsset => !!asset.file_path,
  );

  if (!stills.length && !artwork.length) return null;

  // One ordered list the lightbox walks: every still, then every poster.
  const lightboxItems = [
    ...stills.map((asset) => ({ path: asset.file_path, size: "w1280" })),
    ...artwork.map((asset) => ({ path: asset.file_path, size: "original" })),
  ];
  const artworkOffset = stills.length;

  const scrollStills = (direction: "left" | "right") => {
    stillsRowRef.current?.scrollBy({
      left: direction === "left" ? -600 : 600,
      behavior: "smooth",
    });
  };

  const current = lightboxIndex === null ? null : lightboxItems[lightboxIndex];

  return (
    <>
      <section className="mb-10 border-t border-zinc-800 pt-8">
        <h2 className="mb-4 text-xl font-bold text-white">Gallery</h2>

        {stills.length ? (
          <div className="relative">
            <div
              ref={stillsRowRef}
              className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar"
            >
              {stills.map((asset, i) => (
                <button
                  key={`${asset.file_path}-${i}`}
                  onClick={() => setLightboxIndex(i)}
                  className="relative aspect-video h-28 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800 group"
                >
                  <Image
                    src={tmdbImage(asset.file_path, "w780")}
                    alt={`${title} still`}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="180px"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                    <div className="h-10 w-10 rounded-full border-2 border-white/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <ChevronRight className="ml-0.5 h-4 w-4 text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {stills.length > 3 ? (
              <>
                <button
                  onClick={() => scrollStills("left")}
                  aria-label="Scroll gallery left"
                  className="absolute left-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-300 hover:bg-black/80 hover:text-white transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollStills("right")}
                  aria-label="Scroll gallery right"
                  className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-300 hover:bg-black/80 hover:text-white transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {artwork.length ? (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {artwork.map((asset, i) => {
                const isFeatured = i === 0;
                const isBanner = i === 6 || i === 7;
                return (
                  <div
                    key={`${asset.file_path}-${i}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${title} poster ${i + 1}`}
                    onClick={() => setLightboxIndex(artworkOffset + i)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setLightboxIndex(artworkOffset + i);
                      }
                    }}
                    className={`relative cursor-pointer overflow-hidden rounded-md bg-zinc-800 group ${
                      isFeatured
                        ? "col-span-2 row-span-2 md:col-span-2 md:row-span-2"
                        : isBanner && artwork.length > 6
                          ? "col-span-2 sm:col-span-1 md:col-span-1"
                          : ""
                    }`}
                  >
                    <div
                      className={
                        isFeatured
                          ? "aspect-[4/5] md:aspect-auto md:absolute md:inset-0"
                          : "aspect-[2/3]"
                      }
                    >
                      <Image
                        src={tmdbImage(asset.file_path, isFeatured ? "w780" : "w342")}
                        alt={`${title} poster`}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes={
                          isFeatured
                            ? "(max-width: 768px) 100vw, 50vw"
                            : "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        }
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                      <div className="h-10 w-10 rounded-full border-2 border-white/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <ChevronRight className="ml-0.5 h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {current ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 text-sm font-medium text-zinc-400 hover:text-white transition"
          >
            Close
          </button>
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500">
            {lightboxIndex! + 1} / {lightboxItems.length}
          </span>
          {lightboxIndex! > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex! - 1);
              }}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          {lightboxIndex! < lightboxItems.length - 1 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex! + 1);
              }}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
          <div
            className="relative h-full w-full max-h-[85vh] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={tmdbImage(current.path, current.size)}
              alt={`${title} image ${lightboxIndex! + 1}`}
              fill
              className="object-contain"
              sizes="95vw"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { PlayIcon } from "lucide-react";

export interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  year?: string;
  mediaType: "movie" | "tv";
  genreName?: string;
  voteAverage?: number;
  seasonCount?: number;
}

export default function MediaCard({
  id,
  title,
  posterPath,
  year,
  mediaType,
  genreName,
  voteAverage,
  seasonCount,
}: MediaCardProps) {
  const href = mediaType === "tv" ? `/tv-series/${id}` : `/movies/${id}`;
  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w342${posterPath}`
    : null;

  const typeLabel = mediaType === "tv" ? "TV Series" : "Movie";

  return (
    <Link href={href} className="group block flex-shrink-0 w-[150px] md:w-[170px]">
      {/* Poster */}
      <div className="media-card relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted">
        {posterUrl ? (
          <>
            <div className="absolute inset-0 animate-pulse bg-muted/80 rounded-xl" />
            <Image
              src={posterUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 150px, 170px"
              className="object-cover"
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-muted-foreground text-xs px-2 text-center">
            {title}
          </div>
        )}

        {/* Hover overlay */}
        <div className="card-overlay absolute inset-0 bg-background/40 flex items-center justify-center rounded-xl">
          <div className="w-10 h-10 rounded-full bg-foreground/90 flex items-center justify-center">
            <PlayIcon className="w-5 h-5 text-background ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Rating badge */}
        {voteAverage !== undefined && voteAverage > 0 && (
          <div className="absolute top-2 right-2 bg-background/70 text-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-md z-10">
            ★ {voteAverage.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-semibold leading-tight line-clamp-1 group-hover:text-primary/80 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {year && (
            <span className="text-xs text-muted-foreground">{year}</span>
          )}
          {genreName && (
            <span className="text-xs text-muted-foreground">{genreName}</span>
          )}
          {!genreName && (
            <span className="text-xs text-muted-foreground">{typeLabel}</span>
          )}
        </div>
        {mediaType === "tv" && seasonCount !== undefined && seasonCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {seasonCount} {seasonCount === 1 ? "Season" : "Seasons"}
          </span>
        )}
      </div>
    </Link>
  );
}

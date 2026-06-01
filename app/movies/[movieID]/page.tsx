import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClapperboardIcon,
  Clock3Icon,
  ExternalLinkIcon,
  FilmIcon,
  GlobeIcon,
  PlayIcon,
  QuoteIcon,
  StarIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import {
  getMovieCollection,
  getMovieDetails,
  type MovieCollectionDetails,
  type MovieDetails,
  type TMDBMovieCard,
} from "@/utils/getMovies";

type Props = {
  params: Promise<{ movieID: string }>;
};

const pageShell =
  "rounded-[28px] border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm";

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const listFormatter = new Intl.ListFormat("en-US", {
  style: "long",
  type: "conjunction",
});

function tmdbImage(path: string | null | undefined, size = "original") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return dateFormatter.format(date);
}

function formatRuntime(runtime: number | null | undefined) {
  if (!runtime || runtime <= 0) return "Runtime unavailable";

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function formatCurrency(value: number) {
  if (!value) return "Unknown";
  return currencyFormatter.format(value);
}

function formatVoteCount(value: number) {
  if (!value) return "No votes yet";
  return `${numberFormatter.format(value)} votes`;
}

function formatScore(value: number) {
  if (!value) return "NR";
  return `${Math.round(value * 10)}%`;
}

function getCertification(movie: MovieDetails, region = "US") {
  const releaseSet = movie.release_dates?.results?.find(
    (entry) => entry.iso_3166_1 === region,
  );

  return (
    releaseSet?.release_dates.find((entry) => entry.certification)?.certification
      ?? null
  );
}

function getProviders(movie: MovieDetails, region = "US") {
  const providers = movie["watch/providers"]?.results?.[region];
  if (!providers) return [];

  const order = [
    { key: "flatrate", label: "Stream" },
    { key: "free", label: "Free" },
    { key: "ads", label: "With ads" },
    { key: "rent", label: "Rent" },
    { key: "buy", label: "Buy" },
  ] as const;

  return order
    .map(({ key, label }) => ({
      label,
      link: providers.link,
      providers: providers[key] ?? [],
    }))
    .filter((group) => group.providers.length > 0);
}

function pickTrailer(movie: MovieDetails) {
  const videos = movie.videos?.results ?? [];

  return (
    videos.find(
      (video) =>
        video.site === "YouTube" &&
        video.type === "Trailer" &&
        video.official,
    ) ??
    videos.find(
      (video) => video.site === "YouTube" && video.type === "Trailer",
    ) ??
    videos.find((video) => video.site === "YouTube")
  );
}

function pickLogo(movie: MovieDetails) {
  const logos = movie.images?.logos ?? [];

  return (
    logos.find((logo) => logo.iso_639_1 === "en") ??
    logos.find((logo) => logo.iso_639_1 === null) ??
    logos[0]
  );
}

function uniquePeople(names: string[]) {
  return Array.from(new Set(names.filter(Boolean)));
}

function getCrew(movie: MovieDetails) {
  const crew = movie.credits?.crew ?? [];

  const directors = uniquePeople(
    crew
      .filter((member) => member.job === "Director")
      .map((member) => member.name),
  );

  const writers = uniquePeople(
    crew
      .filter((member) =>
        ["Screenplay", "Writer", "Story"].includes(member.job),
      )
      .map((member) => member.name),
  );

  return {
    directors,
    writers,
  };
}

function getGallery(movie: MovieDetails) {
  const backdrops =
    movie.images?.backdrops.reduce<Array<{ file_path: string; vote_average: number }>>(
      (accumulator, image) => {
        if (image.file_path) {
          accumulator.push({
            file_path: image.file_path,
            vote_average: image.vote_average,
          });
        }

        return accumulator;
      },
      [],
    ) ?? [];

  const merged: Array<{ file_path: string; vote_average: number } | null> = [
    movie.backdrop_path
      ? {
          file_path: movie.backdrop_path,
          vote_average: Number.MAX_SAFE_INTEGER,
        }
      : null,
    ...backdrops,
  ];

  const seen = new Set<string>();

  return merged.filter((item): item is { file_path: string; vote_average: number } => {
    if (!item || seen.has(item.file_path)) {
      return false;
    }

    seen.add(item.file_path);
    return true;
  });
}

function getKeywords(movie: MovieDetails) {
  return movie.keywords?.keywords ?? movie.keywords?.results ?? [];
}

function getRelatedTitles(movie: MovieDetails) {
  const items = [
    ...(movie.recommendations?.results ?? []),
    ...(movie.similar?.results ?? []),
  ];
  const seen = new Set<number>();

  return items.filter((item) => {
    if (!item.poster_path || item.id === movie.id || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

async function getCollection(movie: MovieDetails) {
  if (!movie.belongs_to_collection) {
    return null;
  }

  return getMovieCollection(movie.belongs_to_collection.id);
}

function getEmbedUrl(id: string) {
  return `https://vsembed.ru/embed/movie/${encodeURIComponent(id)}/?autoplay=1&muted=1`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { movieID } = await params;
  const movie = await getMovieDetails(movieID);

  if (!movie) {
    return {
      title: "Movie not found | StreamFlix",
    };
  }

  const year = movie.release_date?.slice(0, 4);
  const title = year
    ? `${movie.title} (${year}) | StreamFlix`
    : `${movie.title} | StreamFlix`;
  const description =
    movie.overview || `Watch ${movie.title} and explore cast, reviews, and details.`;
  const backdrop = tmdbImage(movie.backdrop_path, "w1280");

  return {
    title,
    description,
    openGraph: {
      description,
      images: backdrop ? [{ url: backdrop }] : undefined,
      title,
      type: "website",
    },
  };
}

export default async function Page({ params }: Props) {
  const { movieID } = await params;
  const movie = await getMovieDetails(movieID);

  if (!movie) {
    notFound();
  }

  const collection = await getCollection(movie);
  const certification = getCertification(movie);
  const providers = getProviders(movie);
  const trailer = pickTrailer(movie);
  const logo = pickLogo(movie);
  const crew = getCrew(movie);
  const gallery = getGallery(movie).slice(0, 4);
  const keywords = getKeywords(movie).slice(0, 10);
  const relatedTitles = getRelatedTitles(movie).slice(0, 12);
  const cast = [...(movie.credits?.cast ?? [])]
    .sort((left, right) => left.order - right.order)
    .slice(0, 8);
  const reviews = (movie.reviews?.results ?? []).slice(0, 3);
  const heroBackdrop = tmdbImage(movie.backdrop_path, "w1280");
  const posterUrl = tmdbImage(movie.poster_path, "w780");
  const releaseYear = movie.release_date?.slice(0, 4) ?? "Unknown";
  const collectionParts =
    collection?.parts
      ?.filter((item) => item.poster_path)
      .sort((left, right) => left.release_date.localeCompare(right.release_date))
      .slice(0, 8) ?? [];
  const spokenLanguages = movie.spoken_languages
    .map((language) => language.english_name || language.name)
    .filter(Boolean);
  const productionCountries = movie.production_countries
    .map((country) => country.name)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        {heroBackdrop ? (
          <Image
            src={heroBackdrop}
            alt={movie.title}
            fill
            priority
            className="object-cover object-top opacity-35"
            sizes="100vw"
          />
        ) : null}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,172,254,0.24),transparent_40%),linear-gradient(180deg,color-mix(in oklch,var(--background) 0.12,transparent)_0%,color-mix(in oklch,var(--background) 0.82,transparent)_58%,var(--background)_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-6 md:px-6 lg:px-8 lg:pb-[4.5rem] lg:pt-10">
          <div className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground/70">
            <Link href="/movies" className="transition hover:text-foreground">
              Movies
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="truncate text-foreground">{movie.title}</span>
          </div>

          <div className="max-w-4xl">
            {logo?.file_path ? (
              <div className="relative mb-6 h-[5.5rem] w-full max-w-[420px]">
                <Image
                  src={tmdbImage(logo.file_path, "w500") ?? ""}
                  alt={`${movie.title} logo`}
                  fill
                  className="object-contain object-left drop-shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
                  sizes="(max-width: 768px) 280px, 420px"
                />
              </div>
            ) : (
              <h1 className="mb-5 max-w-4xl text-4xl font-black tracking-tight text-foreground md:text-5xl lg:text-6xl">
                {movie.title}
              </h1>
            )}

            {movie.tagline ? (
              <p className="mb-5 max-w-3xl text-lg text-primary/90 italic md:text-xl">
                {movie.tagline}
              </p>
            ) : null}

            <div className="mb-6 flex flex-wrap items-center gap-2.5">
              <Badge
                variant="outline"
                    className="border-border bg-muted text-foreground"
              >
                {releaseYear}
              </Badge>
              {certification ? (
                <Badge
                  variant="outline"
                      className="border-border bg-muted text-foreground"
                >
                  {certification}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                    className="border-border bg-muted text-foreground"
              >
                {formatRuntime(movie.runtime)}
              </Badge>
              {movie.genres.slice(0, 4).map((genre) => (
                <Badge
                  key={genre.id}
                  variant="outline"
                      className="border-border bg-muted text-foreground"
                >
                  {genre.name}
                </Badge>
              ))}
            </div>

            <p className="mb-8 max-w-3xl text-base leading-8 text-foreground/85 md:text-lg">
              {movie.overview || "Plot details are not available for this title yet."}
            </p>

            <div className="mb-8 flex flex-wrap gap-3">
              <a
                href="#watch-now"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "gap-2 bg-sky-300 px-5 text-sky-950 hover:bg-sky-200",
                )}
              >
                <PlayIcon className="size-4" fill="currentColor" />
                Watch now
              </a>

              {trailer ? (
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noreferrer"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "gap-2 border-border bg-muted/50 px-5 text-foreground hover:bg-accent",
                    )}
                  >
                    <FilmIcon className="size-4" />
                    Official trailer
                  </a>
                ) : null}

                {movie.imdb_id ? (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}/`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "gap-2 border-border bg-muted/50 px-5 text-foreground hover:bg-accent",
                    )}
                  >
                    <ExternalLinkIcon className="size-4" />
                  IMDb
                </a>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={StarIcon}
                label="Audience Score"
                value={formatScore(movie.vote_average)}
                caption={formatVoteCount(movie.vote_count)}
              />
              <MetricCard
                icon={TrendingUpIcon}
                label="Popularity"
                value={numberFormatter.format(Math.round(movie.popularity))}
                caption="Live TMDB popularity index"
              />
              <MetricCard
                icon={WalletIcon}
                label="Box Office"
                value={formatCurrency(movie.revenue)}
                caption={`Budget ${formatCurrency(movie.budget)}`}
              />
              <MetricCard
                icon={Clock3Icon}
                label="Release Date"
                value={formatDate(movie.release_date)}
                caption={movie.status || "Status unavailable"}
              />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <CrewCard
                eyebrow="Directed by"
                names={crew.directors}
                fallback="Director data unavailable"
              />
              <CrewCard
                eyebrow="Written by"
                names={crew.writers}
                fallback="Writer data unavailable"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <section id="watch-now" className={pageShell}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/70">
                    Now Playing
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    Watch {movie.title}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="border-border bg-muted/50 text-foreground"
                  >
                    {formatRuntime(movie.runtime)}
                  </Badge>
                  {certification ? (
                    <Badge
                      variant="outline"
                      className="border-border bg-muted/50 text-foreground"
                    >
                      {certification}
                    </Badge>
                  ) : null}
                  <Badge
                    variant="outline"
                    className="border-border bg-muted/50 text-foreground"
                  >
                    {movie.status}
                  </Badge>
                </div>
              </div>

              <div className="relative aspect-video overflow-hidden rounded-b-[28px] bg-black">
                <iframe
                  src={getEmbedUrl(movieID)}
                  title={movie.title || "Movie player"}
                  className="absolute inset-0 h-full w-full border-none"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <GlassSection
                eyebrow="Storyline"
                title="What this movie is about"
              >
                <p className="text-sm leading-7 text-foreground/85 md:text-base">
                  {movie.overview ||
                    "TMDB does not have an overview for this title yet."}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InfoBlock
                    label="Original title"
                    value={movie.original_title || movie.title}
                  />
                  <InfoBlock
                    label="Original language"
                    value={movie.original_language.toUpperCase()}
                  />
                  <InfoBlock
                    label="Spoken languages"
                    value={
                      spokenLanguages.length
                        ? listFormatter.format(spokenLanguages.slice(0, 4))
                        : "Not listed"
                    }
                  />
                  <InfoBlock
                    label="Production countries"
                    value={
                      productionCountries.length
                        ? listFormatter.format(productionCountries.slice(0, 3))
                        : "Not listed"
                    }
                  />
                </div>
              </GlassSection>

              <GlassSection eyebrow="Cast" title="Top billed talent">
                <div className="grid gap-3 sm:grid-cols-2">
                  {cast.length ? (
                    cast.map((member) => (
                      <CastCard key={member.id} member={member} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground/80">
                      Cast details are not available for this title yet.
                    </p>
                  )}
                </div>
              </GlassSection>
            </div>

            {gallery.length ? (
              <GlassSection eyebrow="Gallery" title="Stills and artwork">
                <div className="grid gap-4 md:grid-cols-2">
                  {gallery.map((image, index) => (
                    <div
                      key={`${image.file_path}-${index}`}
                      className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted/50"
                    >
                      <Image
                        src={tmdbImage(image.file_path, "w780") ?? ""}
                        alt={`${movie.title} still ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  ))}
                </div>
              </GlassSection>
            ) : null}

            {reviews.length ? (
              <GlassSection eyebrow="Reviews" title="Audience reactions">
                <div className="grid gap-4 lg:grid-cols-3">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-border bg-muted p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {review.author_details?.name ||
                              review.author ||
                              "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(review.created_at)}
                          </p>
                        </div>

                        {review.author_details?.rating ? (
                          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                            {review.author_details.rating}/10
                          </span>
                        ) : null}
                      </div>

                      <QuoteIcon className="mb-3 size-4 text-muted-foreground/50" />
                      <p className="line-clamp-6 text-sm leading-7 text-foreground/85">
                        {review.content}
                      </p>

                      <a
                        href={review.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-200 transition hover:text-sky-100"
                      >
                        Read full review
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </article>
                  ))}
                </div>
              </GlassSection>
            ) : null}

            {relatedTitles.length ? (
              <PosterRail title="You May Also Like" items={relatedTitles} />
            ) : null}

            {collectionParts.length > 1 ? (
              <PosterRail
                title={`From the ${collection?.name ?? "Collection"}`}
                items={collectionParts}
                highlightId={movie.id}
              />
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section className={pageShell}>
              <div className="relative aspect-[2/3] overflow-hidden rounded-[28px] rounded-b-none border-b border-border bg-card">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={`${movie.title} poster`}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 320px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted-foreground/30 to-background p-6 text-center text-lg font-semibold text-foreground">
                    {movie.title}
                  </div>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    label="TMDB Score"
                    value={movie.vote_average ? movie.vote_average.toFixed(1) : "NR"}
                  />
                  <MiniStat
                    label="Votes"
                    value={numberFormatter.format(movie.vote_count)}
                  />
                  <MiniStat label="Runtime" value={formatRuntime(movie.runtime)} />
                  <MiniStat label="Status" value={movie.status || "Unknown"} />
                </div>

                <div className="space-y-3 border-t border-border pt-4 text-sm">
                  <SidebarRow label="Release">
                    {formatDate(movie.release_date)}
                  </SidebarRow>
                  <SidebarRow label="Budget">
                    {formatCurrency(movie.budget)}
                  </SidebarRow>
                  <SidebarRow label="Revenue">
                    {formatCurrency(movie.revenue)}
                  </SidebarRow>
                  <SidebarRow label="Genres">
                    {movie.genres.length
                      ? movie.genres.map((genre) => genre.name).join(", ")
                      : "Not listed"}
                  </SidebarRow>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {movie.homepage ? (
                    <a
                      href={movie.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:bg-accent"
                    >
                      <GlobeIcon className="size-3.5" />
                      Website
                    </a>
                  ) : null}
                  {trailer ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${trailer.key}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:bg-accent"
                    >
                      <PlayIcon className="size-3.5" />
                      Trailer
                    </a>
                  ) : null}
                  {movie.imdb_id ? (
                    <a
                      href={`https://www.imdb.com/title/${movie.imdb_id}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:bg-accent"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                      IMDb
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <GlassSection eyebrow="Watch" title="Where to watch in the US">
              {providers.length ? (
                <div className="space-y-4">
                  {providers.map((group) => (
                    <div key={group.label}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          {group.label}
                        </p>
                        {group.link ? (
                          <a
                            href={group.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-sky-200 transition hover:text-sky-100"
                          >
                            Open provider list
                          </a>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {group.providers.slice(0, 6).map((provider) => (
                          <div
                            key={provider.provider_id}
                            className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-2.5 py-2"
                          >
                            {provider.logo_path ? (
                              <div className="relative size-8 overflow-hidden rounded-lg">
                                <Image
                                  src={tmdbImage(provider.logo_path, "w92") ?? ""}
                                  alt={provider.provider_name}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </div>
                            ) : null}
                            <span className="text-xs font-medium text-foreground">
                              {provider.provider_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground/80">
                  TMDB does not list US watch providers for this title right now.
                </p>
              )}
            </GlassSection>

            <GlassSection eyebrow="Production" title="Behind the scenes">
              <div className="space-y-3 text-sm">
                <SidebarRow label="Studios">
                  {movie.production_companies.length
                    ? movie.production_companies
                        .slice(0, 5)
                        .map((company) => company.name)
                        .join(", ")
                    : "Not listed"}
                </SidebarRow>
                <SidebarRow label="Countries">
                  {productionCountries.length
                    ? productionCountries.join(", ")
                    : "Not listed"}
                </SidebarRow>
                <SidebarRow label="Languages">
                  {spokenLanguages.length
                    ? spokenLanguages.slice(0, 5).join(", ")
                    : "Not listed"}
                </SidebarRow>
              </div>
            </GlassSection>

            {keywords.length ? (
              <GlassSection eyebrow="Keywords" title="Themes and topics">
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <Badge
                      key={keyword.id}
                      variant="outline"
                      className="border-border bg-muted/50 text-foreground"
                    >
                      {keyword.name}
                    </Badge>
                  ))}
                </div>
              </GlassSection>
            ) : null}

            {collection ? (
              <CollectionCard collection={collection} currentMovieId={movie.id} />
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  caption,
  icon: Icon,
  label,
  value,
}: {
  caption: string;
  icon: typeof StarIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-primary/80">
        <Icon className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.22em]">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground/70">{caption}</p>
    </div>
  );
}

function CrewCard({
  eyebrow,
  fallback,
  names,
}: {
  eyebrow: string;
  fallback: string;
  names: string[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/70">
        {eyebrow}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">
        {names.length ? listFormatter.format(names.slice(0, 3)) : fallback}
      </p>
    </div>
  );
}

function GlassSection({
  children,
  className,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={cn(pageShell, className)}>
      <div className="border-b border-border px-5 py-4 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/70">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm leading-7 text-foreground">{value}</p>
    </div>
  );
}

function CastCard({
  member,
}: {
  member: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  };
}) {
  const profileUrl = tmdbImage(member.profile_path, "w185");

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted p-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-muted-foreground/30 to-background">
        {profileUrl ? (
          <Image
            src={profileUrl}
            alt={member.name}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-foreground">
            {member.name
              .split(" ")
              .slice(0, 2)
              .map((token) => token[0])
              .join("")}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{member.name}</p>
        <p className="truncate text-sm text-muted-foreground/80">
          {member.character || "Role unavailable"}
        </p>
      </div>
    </div>
  );
}

function PosterRail({
  highlightId,
  items,
  title,
}: {
  highlightId?: number;
  items: TMDBMovieCard[];
  title: string;
}) {
  return (
    <GlassSection eyebrow="More to watch" title={title}>
      <div className="flex gap-4 overflow-x-auto pb-1 hide-scrollbar">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/movies/${item.id}`}
            className="group block w-[170px] shrink-0"
          >
            <div
              className={cn(
                "relative aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-muted/50 transition duration-300 group-hover:-translate-y-1 group-hover:border-sky-200/30",
                highlightId === item.id && "border-sky-300/70 ring-2 ring-sky-300/25",
              )}
            >
              {item.poster_path ? (
                <Image
                  src={tmdbImage(item.poster_path, "w342") ?? ""}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="170px"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm font-medium text-foreground">
                  {item.title}
                </div>
              )}
            </div>

            <div className="mt-3 px-1">
              <p className="line-clamp-2 font-semibold text-foreground transition group-hover:text-sky-100">
                {item.title}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{item.release_date?.slice(0, 4) || "TBA"}</span>
                {item.vote_average ? (
                  <span className="inline-flex items-center gap-1">
                    <StarIcon className="size-3 fill-amber-300 text-amber-300" />
                    {item.vote_average.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </GlassSection>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SidebarRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

function CollectionCard({
  collection,
  currentMovieId,
}: {
  collection: MovieCollectionDetails;
  currentMovieId: number;
}) {
  const parts = collection.parts
    .filter((item) => item.poster_path)
    .sort((left, right) => left.release_date.localeCompare(right.release_date))
    .slice(0, 5);

  return (
    <GlassSection eyebrow="Franchise" title={collection.name}>
      <p className="text-sm leading-7 text-muted-foreground/80">
        {collection.overview || "A larger film collection connected to this title."}
      </p>

      <div className="mt-4 space-y-2">
        {parts.map((item) => (
          <Link
            key={item.id}
            href={`/movies/${item.id}`}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-3 py-3 text-sm transition hover:border-sky-200/30 hover:bg-muted/80",
              item.id === currentMovieId && "border-sky-300/50 bg-sky-300/10",
            )}
          >
            <div className="flex items-center gap-3">
              <ClapperboardIcon className="size-4 text-sky-100/80" />
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.release_date?.slice(0, 4) || "TBA"}
                </p>
              </div>
            </div>

            {item.id === currentMovieId ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                Current
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </GlassSection>
  );
}

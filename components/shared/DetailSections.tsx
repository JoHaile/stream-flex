"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Languages,
  Quote,
  StarIcon,
  Tv,
} from "lucide-react";
import type {
  TMDBKeyword,
  TMDBReview,
  TMDBWatchProviderResult,
} from "@/utils/tmdb";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function tmdbImage(path: string | null | undefined, size = "original") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";
  return dateFormatter.format(date);
}

type CompanyLike = { id: number; name: string; logo_path: string | null };
type CountryLike = { iso_3166_1: string; name: string };
type LanguageLike = { iso_639_1: string; english_name: string };

const arrowButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition";

function SectionHeader({
  title,
  count,
  badge,
  showArrows = false,
  onScrollLeft,
  onScrollRight,
}: {
  title: string;
  count?: number;
  badge?: React.ReactNode;
  showArrows?: boolean;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {count !== undefined ? (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
            {count}
          </span>
        ) : null}
        {badge}
      </div>
      {showArrows ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onScrollLeft}
            aria-label={`Scroll ${title.toLowerCase()} left`}
            className={arrowButtonClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onScrollRight}
            aria-label={`Scroll ${title.toLowerCase()} right`}
            className={arrowButtonClass}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Reviews --------------------------------- */

function ReviewCard({ review }: { review: TMDBReview }) {
  const avatar = review.author_details?.avatar_path;
  // TMDB returns an absolute Gravatar URL for authors without a TMDB account.
  // Only serve avatars hosted by TMDB; anything else falls back to initials.
  const avatarUrl = avatar?.startsWith("/")
    ? `https://image.tmdb.org/t/p/w45${avatar}`
    : null;
  const rating = review.author_details?.rating ?? null;
  const cleanContent = review.content.replace(/<\/?[^>]+(>|$)/g, "");

  return (
    <article className="group relative flex w-[360px] flex-shrink-0 flex-col rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-900/30 p-5 ring-1 ring-zinc-800 transition hover:ring-zinc-600">
      <Quote className="absolute right-4 top-4 h-6 w-6 text-zinc-800 transition group-hover:text-red-500/50" />

      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-zinc-700 ring-2 ring-zinc-700/60">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={review.author}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-zinc-400">
              {review.author[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {review.author_details?.name || review.author}
          </p>
          <p className="text-xs text-zinc-500">{formatDate(review.created_at)}</p>
        </div>
        {rating !== null ? (
          <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-400 ring-1 ring-yellow-500/25">
            <StarIcon className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {rating.toFixed(1)}
          </div>
        ) : null}
      </div>

      <p className="flex-1 text-sm leading-relaxed text-zinc-400 line-clamp-5">
        {cleanContent}
      </p>

      <a
        href={review.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 border-t border-zinc-800 pt-3 text-xs font-semibold text-red-400 transition hover:text-red-300"
      >
        Read full review
        <ExternalLink className="h-3 w-3" />
      </a>
    </article>
  );
}

export function ReviewsSection({ reviews }: { reviews: TMDBReview[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: "left" | "right") =>
    rowRef.current?.scrollBy({
      left: direction === "left" ? -600 : 600,
      behavior: "smooth",
    });

  return (
    <section className="mb-10 border-t border-zinc-800 pt-8">
      <SectionHeader
        title="Reviews"
        count={reviews.length}
        showArrows={reviews.length > 2}
        onScrollLeft={() => scroll("left")}
        onScrollRight={() => scroll("right")}
      />
      <div ref={rowRef} className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- Where to Watch ------------------------------ */

const PROVIDER_GROUPS = [
  { key: "flatrate", label: "Stream", dot: "bg-green-500" },
  { key: "rent", label: "Rent", dot: "bg-blue-500" },
  { key: "buy", label: "Buy", dot: "bg-yellow-500" },
] as const;

function ProviderTile({
  name,
  logoPath,
}: {
  name: string;
  logoPath: string | null;
}) {
  const logoUrl = tmdbImage(logoPath, "w92");
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      <div className="h-12 w-12 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-zinc-700 transition hover:ring-zinc-500">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-zinc-500">
            {name[0]}
          </div>
        )}
      </div>
      <span className="line-clamp-2 text-center text-[10px] leading-tight text-zinc-500">
        {name}
      </span>
    </div>
  );
}

export function WhereToWatchSection({
  providers,
}: {
  providers: TMDBWatchProviderResult;
}) {
  const groups = PROVIDER_GROUPS.map((group) => ({
    ...group,
    items: providers[group.key] ?? [],
  })).filter((group) => group.items.length > 0);

  if (!groups.length) return null;

  return (
    <section className="mb-10 border-t border-zinc-800 pt-8">
      <SectionHeader
        title="Where to Watch"
        badge={
          <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            US
          </span>
        }
      />
      <div className="flex flex-wrap gap-x-10 gap-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span className={`h-1.5 w-1.5 rounded-full ${group.dot}`} />
              {group.label}
            </p>
            <div className="flex flex-wrap gap-3">
              {group.items.map((provider) => (
                <ProviderTile
                  key={provider.provider_id}
                  name={provider.provider_name}
                  logoPath={provider.logo_path}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------- Production -------------------------------- */

/** ISO-3166 alpha-2 → flag emoji (regional indicator letters). */
function flagFor(code: string | null | undefined) {
  if (!code || code.length !== 2) return null;
  const base = 0x1f1e6;
  const letters = code
    .toUpperCase()
    .split("")
    .map((char) => char.charCodeAt(0) - 65);
  if (letters.some((n) => n < 0 || n > 25)) return null;
  return String.fromCodePoint(...letters.map((n) => base + n));
}

/** Production lists repeat themselves (same studio credited twice), so dedupe. */
function uniqueBy<T>(items: T[], key: (item: T) => string | number) {
  const seen = new Set<string | number>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function Panel({
  label,
  icon: Icon,
  count,
  children,
}: {
  label: string;
  icon: typeof Building2;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300 ring-1 ring-white/10">
          <Icon className="size-3.5" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
          {label}
        </p>
        {count > 1 ? (
          <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold tabular-nums text-zinc-400">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function CompanyRow({ company }: { company: CompanyLike }) {
  const logoUrl = tmdbImage(company.logo_path, "w92");

  return (
    <li className="flex items-center gap-2.5">
      <span className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.08] ring-1 ring-white/10">
        {logoUrl ? (
          <Image
            src={tmdbImage(company.logo_path, "w185") ?? logoUrl}
            alt=""
            width={185}
            height={185}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <Building2 className="size-3.5 text-zinc-500" />
        )}
      </span>
      <span className="line-clamp-2 min-w-0 text-[13px] font-medium leading-tight text-white/85">
        {company.name}
      </span>
    </li>
  );
}

function TagList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

export function ProductionSection({
  companies,
  networks = [],
  countries,
  languages,
}: {
  companies: CompanyLike[];
  networks?: CompanyLike[];
  countries: CountryLike[];
  languages: LanguageLike[];
}) {
  const studios = uniqueBy(companies, (company) => company.id);
  const channels = uniqueBy(networks, (network) => network.id);
  const places = uniqueBy(countries, (country) => country.iso_3166_1);
  const spoken = uniqueBy(languages, (language) => language.iso_639_1);

  if (!studios.length && !channels.length && !places.length && !spoken.length) {
    return null;
  }

  return (
    <section className="mb-10 border-t border-zinc-800 pt-8">
      <SectionHeader title="Production" />
      {/* One column on phones, two from sm, so long studio names never squeeze. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {studios.length ? (
          <Panel label="Studios" icon={Building2} count={studios.length}>
            <ul className="space-y-2.5">
              {studios.map((company) => (
                <CompanyRow key={company.id} company={company} />
              ))}
            </ul>
          </Panel>
        ) : null}

        {channels.length ? (
          <Panel label="Networks" icon={Tv} count={channels.length}>
            <ul className="space-y-2.5">
              {channels.map((network) => (
                <CompanyRow key={network.id} company={network} />
              ))}
            </ul>
          </Panel>
        ) : null}

        {places.length ? (
          <Panel label="Countries" icon={Globe2} count={places.length}>
            <TagList>
              {places.map((country) => {
                const flag = flagFor(country.iso_3166_1);
                return (
                  <span
                    key={country.iso_3166_1}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-zinc-900/70 px-2.5 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-white/10"
                  >
                    {flag ? (
                      <span aria-hidden className="text-sm leading-none">
                        {flag}
                      </span>
                    ) : (
                      <Globe2 className="size-3 text-zinc-500" />
                    )}
                    <span className="truncate">{country.name}</span>
                  </span>
                );
              })}
            </TagList>
          </Panel>
        ) : null}

        {spoken.length ? (
          <Panel label="Languages" icon={Languages} count={spoken.length}>
            <TagList>
              {spoken.map((language) => (
                <span
                  key={language.iso_639_1}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-zinc-900/70 px-2 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-white/10"
                >
                  <span className="rounded bg-white/[0.08] px-1 py-0.5 text-[9px] font-bold uppercase text-zinc-400">
                    {language.iso_639_1}
                  </span>
                  <span className="truncate">{language.english_name}</span>
                </span>
              ))}
            </TagList>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------------- Keywords --------------------------------- */

export function KeywordsSection({ keywords }: { keywords: TMDBKeyword[] }) {
  if (!keywords.length) return null;

  return (
    <section className="mb-10 border-t border-zinc-800 pt-8">
      <SectionHeader title="Keywords" count={keywords.length} />
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span
            key={keyword.id}
            className="cursor-default rounded-full bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-800 transition hover:bg-red-500/10 hover:text-red-300 hover:ring-red-500/30"
          >
            <span className="mr-0.5 text-zinc-600">#</span>
            {keyword.name}
          </span>
        ))}
      </div>
    </section>
  );
}

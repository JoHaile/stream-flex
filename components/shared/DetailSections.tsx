"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Languages,
  Quote,
  StarIcon,
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

function LogoTile({ company }: { company: CompanyLike }) {
  const logoUrl = tmdbImage(company.logo_path, "w92");
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-lg bg-zinc-900/60 px-3 ring-1 ring-zinc-800 transition hover:ring-zinc-600">
      {logoUrl ? (
        <div className="relative h-7 w-10 flex-shrink-0">
          <Image
            src={logoUrl}
            alt={company.name}
            fill
            sizes="40px"
            className="object-contain"
          />
        </div>
      ) : null}
      <span className="text-sm text-white/80">{company.name}</span>
    </div>
  );
}

function ChipGroup({
  label,
  icon,
  items,
}: {
  label: string;
  icon: React.ReactNode;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-800"
          >
            {icon}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
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
  if (
    !companies.length &&
    !networks.length &&
    !countries.length &&
    !languages.length
  ) {
    return null;
  }

  return (
    <section className="mb-10 border-t border-zinc-800 pt-8">
      <SectionHeader title="Production" />
      <div className="space-y-6">
        {companies.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Studios
            </p>
            <div className="flex flex-wrap gap-2">
              {companies.map((company) => (
                <LogoTile key={company.id} company={company} />
              ))}
            </div>
          </div>
        ) : null}

        {networks.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Networks
            </p>
            <div className="flex flex-wrap gap-2">
              {networks.map((network) => (
                <LogoTile key={network.id} company={network} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <ChipGroup
            label="Countries"
            icon={<Globe2 className="h-3.5 w-3.5 text-zinc-500" />}
            items={countries.map((country) => country.name)}
          />
          <ChipGroup
            label="Languages"
            icon={<Languages className="h-3.5 w-3.5 text-zinc-500" />}
            items={languages.map((language) => language.english_name)}
          />
        </div>
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

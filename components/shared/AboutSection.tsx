import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type AboutPerson = {
  id?: number | string;
  name: string;
  profile_path?: string | null;
};

export type AboutCrewGroup = {
  /** "Director", "Writer", "Created by", … */
  label: string;
  people: AboutPerson[];
};

export type AboutStat = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass?: string;
};

type Props = {
  title: string;
  overview: string;
  tagline?: string | null;
  stats: AboutStat[];
  crewGroups?: AboutCrewGroup[];
  imdbId?: string | null;
  className?: string;
};

function profileImage(path: string | null | undefined) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PersonCard({ person, role }: { person: AboutPerson; role: string }) {
  const avatar = profileImage(person.profile_path);

  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/10">
        {avatar ? (
          <Image
            src={avatar}
            alt={person.name}
            width={88}
            height={88}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-zinc-500">
            {initials(person.name)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight text-white">
          {person.name}
        </p>
        <p className="truncate text-[11px] text-zinc-500">{role}</p>
      </div>
    </div>
  );
}

/**
 * The "About" block on the movie and series detail pages: overview on the left,
 * key numbers under it and the crew (with photos, like the cast row) on the
 * right. Collapses to one column below lg.
 */
export default function AboutSection({
  title,
  overview,
  tagline,
  stats,
  crewGroups = [],
  imdbId,
  className,
}: Props) {
  const groups = crewGroups.filter((group) => group.people.length > 0);

  return (
    <section
      id="about"
      className={cn("mb-10 border-t border-zinc-800 pt-8", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
          About {title}
        </h2>

        {imdbId ? (
          <a
            href={`https://www.imdb.com/title/${imdbId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-yellow-400 ring-1 ring-yellow-500/30 transition hover:bg-yellow-500/25"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 7.5v9H18v-9h-1.5zM12 7.5v9h1.5v-9H12zm-3 9V9.75L6 12.75V9H4.5v9H6l3-3.75V16.5H9v-6.75L12 12.75V9H9v7.5zM3 6v12h18V6H3z" />
            </svg>
            IMDb
          </a>
        ) : null}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <div className="min-w-0">
          {tagline ? (
            <p className="mb-3 border-l-2 border-red-500/60 pl-3 text-sm italic leading-relaxed text-zinc-400">
              {tagline}
            </p>
          ) : null}

          <p className="text-sm leading-7 text-zinc-300 md:text-[15px]">
            {overview}
          </p>

          {stats.length ? (
            <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    <stat.icon
                      className={cn("h-3.5 w-3.5", stat.iconClass ?? "text-red-400")}
                    />
                    {stat.label}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold leading-snug text-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {groups.length ? (
          <div className="space-y-4 lg:border-l lg:border-white/[0.06] lg:pl-6">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  {group.label}
                </p>
                <div className="space-y-2.5">
                  {group.people.slice(0, 4).map((person, index) => (
                    <PersonCard
                      key={`${person.id ?? person.name}-${index}`}
                      person={person}
                      role={group.label}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

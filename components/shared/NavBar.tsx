"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  ChevronRight,
  Clapperboard,
  House,
  Menu,
  Play,
  Sparkles,
  Tv,
  XIcon,
} from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import type { SearchResultItem } from "@/utils/catalog";
import Image from "next/image";
import SearchCommand from "@/components/shared/SearchCommand";

function tmdbImage(path: string | null | undefined, size = "w92") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function NavSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) return;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    setQuery("");
    setOpen(false);
    router.push(
      item.media_type === "tv" ? `/tv-series/${item.id}` : `/movies/${item.id}`,
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value.trim()) {
            setResults([]);
            setOpen(false);
          }
        }}
        placeholder="Search movies & TV series..."
        className="w-56 rounded bg-zinc-800 py-1.5 pl-3 pr-7 text-xs text-zinc-200 placeholder-zinc-500 ring-1 ring-zinc-700 focus:outline-none focus:ring-red-500"
      />
      {query ? (
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {loading ? (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
        </div>
      ) : null}

      {open && results.length > 0 ? (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl z-50">
          {results.slice(0, 8).map((item) => {
            const title = item.title || item.name || "Untitled";
            const year = (item.release_date || item.first_air_date || "").slice(
              0,
              4,
            );
            const poster = tmdbImage(item.poster_path);
            return (
              <button
                key={`${item.media_type}-${item.id}`}
                onClick={() => handleSelect(item)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 transition"
              >
                <div className="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={title}
                      width={32}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                      N/A
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {year ? <span>{year}</span> : null}
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">
                      {item.media_type === "tv" ? "TV" : "Movie"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const NavLinks = ({
  pathname,
  links,
  className,
}: {
  pathname: string;
  links: { href: string; label: string }[];
  className?: string;
}) => {
  return (
    <ul className={`flex flex-row items-center gap-6 ${className}`}>
      {links.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`text-sm font-medium transition-colors block ${
                isActive ? "text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {link.label}
              {isActive && (
                <span className="block h-0.5 mt-0.5 bg-red-500 rounded-full" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

const NavActions = ({ className }: { className?: string }) => {
  return (
    <div className={`flex flex-row items-center gap-3 ${className}`}>
      <button className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
        <BellIcon className="w-4 h-4 text-zinc-400" />
      </button>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white shadow-sm" />
    </div>
  );
};

const MOBILE_LINK_ICONS = [House, Clapperboard, Tv, Sparkles] as const;

/** Rows inside the hamburger drawer: icon tile, label, chevron; the active
 *  route gets the red accent. Wrapped in DrawerClose so tapping navigates and
 *  shuts the drawer in one go. */
function MobileMenuLinks({
  pathname,
  links,
}: {
  pathname: string;
  links: { href: string; label: string }[];
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {links.map((link, index) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const Icon = MOBILE_LINK_ICONS[index % MOBILE_LINK_ICONS.length];

        return (
          <li key={link.href}>
            <DrawerClose asChild>
              <Link
                href={link.href}
                className={`group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition ${
                  isActive
                    ? "bg-red-500/10 ring-1 ring-red-500/25"
                    : "hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                    isActive
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/5 text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    isActive ? "text-white" : "text-zinc-300"
                  }`}
                >
                  {link.label}
                </span>
                <ChevronRight
                  className={`h-4 w-4 transition ${
                    isActive ? "text-red-400" : "text-zinc-600"
                  }`}
                />
              </Link>
            </DrawerClose>
          </li>
        );
      })}
    </ul>
  );
}

function MobileMenuFooter() {
  return (
    <div className="space-y-1.5">
      <button className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-white/5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 transition group-hover:text-zinc-200">
          <BellIcon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-left text-sm font-semibold text-zinc-300">
          Notifications
        </span>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </button>
      <button className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-white/5">
        <span className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white/20" />
        <span className="flex-1 text-left text-sm font-semibold text-zinc-300">
          Profile
        </span>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </button>
    </div>
  );
}

function NavBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/tv-series", label: "Series" },
    { href: "/anime", label: "Anime" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md shadow-lg shadow-black/20"
          : "bg-black/30 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-xl font-black tracking-tight text-white hover:opacity-80 transition-opacity"
        >
          StreamFlix
        </Link>

        <nav className="hidden md:block">
          <NavLinks pathname={pathname} links={links} />
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <NavSearch />
          <NavActions />
        </div>

        <div className="md:hidden flex items-center gap-1">
          <SearchCommand triggerClassName="p-2 rounded-full hover:bg-zinc-800 transition-colors" />
          <Drawer direction="right">
            <DrawerTrigger asChild>
              <button
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-zinc-400" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="border-zinc-800/80 bg-zinc-950 text-white">
              <DrawerHeader className="flex-row items-center justify-between gap-2 border-b border-zinc-800/80 text-left">
                <DrawerTitle className="flex items-center gap-2.5 text-lg font-black tracking-tight text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-500 ring-1 ring-red-500/30">
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                  </span>
                  StreamFlix
                </DrawerTitle>
                <DrawerClose
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Close menu"
                >
                  <XIcon className="h-4 w-4" />
                </DrawerClose>
              </DrawerHeader>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Browse
                </p>
                <MobileMenuLinks pathname={pathname} links={links} />
              </div>

              <div className="border-t border-zinc-800/80 p-3">
                <p className="px-2.5 pb-1 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Account
                </p>
                <MobileMenuFooter />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}

export default NavBar;

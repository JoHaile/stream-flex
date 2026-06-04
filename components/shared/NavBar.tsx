"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellIcon, Menu, XIcon } from "lucide-react";
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
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
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
        onChange={(e) => setQuery(e.target.value)}
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
  isMobile = false,
}: {
  pathname: string;
  links: { href: string; label: string }[];
  className?: string;
  isMobile?: boolean;
}) => {
  return (
    <ul
      className={`flex ${
        isMobile ? "flex-col gap-1" : "flex-row items-center gap-6"
      } ${className}`}
    >
      {links.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        const linkContent = (
          <Link
            href={link.href}
            className={`text-sm font-medium transition-colors block ${
              isMobile
                ? "py-2.5 px-3 rounded-lg hover:bg-zinc-800"
                : ""
            } ${isActive ? "text-white" : "text-zinc-400 hover:text-white"}`}
          >
            {link.label}
            {isActive && (
              <span
                className={`block h-0.5 ${
                  isMobile ? "mt-1" : "mt-0.5"
                } bg-red-500 rounded-full`}
              />
            )}
          </Link>
        );

        return (
          <li key={link.href} className="w-full">
            {isMobile ? (
              <DrawerClose asChild>{linkContent}</DrawerClose>
            ) : (
              linkContent
            )}
          </li>
        );
      })}
    </ul>
  );
};

const NavActions = ({
  className,
  isMobile = false,
}: {
  className?: string;
  isMobile?: boolean;
}) => {
  return (
    <div
      className={`flex ${
        isMobile
          ? "flex-row items-center justify-between w-full pt-2"
          : "flex-row items-center gap-3"
      } ${className}`}
    >
      {isMobile ? (
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Account
        </span>
      ) : null}
      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors flex items-center gap-2">
          <BellIcon className="w-4 h-4 text-zinc-400" />
          {isMobile && (
            <span className="text-sm text-zinc-300">Notifications</span>
          )}
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white shadow-sm" />
      </div>
    </div>
  );
};

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
          <Drawer>
            <DrawerTrigger asChild>
              <button
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-zinc-400" />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-white">Menu</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-6 p-4 pt-0">
                <NavLinks pathname={pathname} links={links} isMobile />
                <div className="h-px bg-zinc-800" />
                <NavActions isMobile />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}

export default NavBar;

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";
import type { SearchScope } from "@/utils/catalog";

type Props = {
  placeholder: string;
  scope: SearchScope;
  scopeLabel: string;
};

/**
 * Category-scoped search. The term lives in the URL as `?search=`, so the server
 * renders matching results for that catalog only and the state survives reload
 * or sharing. Typing is debounced; Enter and Clear commit immediately.
 */
export default function CategorySearch({ placeholder, scope, scopeLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentTerm = searchParams.get("search") ?? "";
  const [value, setValue] = useState(currentTerm);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.trim() === currentTerm.trim()) return;

    const timer = setTimeout(() => {
      commit(value);
    }, 420);

    return () => clearTimeout(timer);
    // `commit` only depends on the values below; re-declaring it every render
    // would reset the debounce on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currentTerm, pathname, searchParams]);

  function commit(nextValue: string) {
    const trimmed = nextValue.trim();
    if (trimmed === (searchParams.get("search") ?? "").trim()) return;

    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }
    params.delete("page");

    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  }

  const clear = () => {
    setValue("");
    commit("");
    inputRef.current?.focus();
  };

  return (
    <div className="group relative" data-scope={scope}>
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 opacity-0 blur transition duration-300 group-focus-within:opacity-100" />
      <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl transition-colors focus-within:border-red-500/40 sm:py-3.5">
        {isPending ? (
          <LoaderCircleIcon className="size-5 shrink-0 animate-spin text-red-400" />
        ) : (
          <SearchIcon className="size-5 shrink-0 text-zinc-500 transition-colors group-focus-within:text-zinc-300" />
        )}

        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(value);
            }
            if (event.key === "Escape" && value) {
              event.preventDefault();
              clear();
            }
          }}
          type="search"
          inputMode="search"
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />

        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}

        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 sm:flex">
          <span className="size-1.5 rounded-full bg-red-500" />
          {scopeLabel} only
        </span>
      </div>
    </div>
  );
}

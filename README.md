# StreamFlix

A movie and TV series browsing app built on the [TMDB API](https://developer.themoviedb.org/docs/getting-started). Discover titles, browse by category, search, and play movies and episodes in an embedded player.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript, and Tailwind CSS v4.

## Features

- **Home** — featured hero, trending rows, and top-rated rails
- **Catalog** — browse movies and TV series with genre, year, rating, and sort filters
- **Discover** — per-media-type sections (`/discover/movies/popular`, `/discover/tv-series/top_rated`, …)
- **Search** — instant typeahead via the `cmdk` command palette, plus a server route
- **Detail pages** — cast, overview, gallery, reviews, streaming providers, production details, keywords, and related titles
- **TV seasons** — season selector with per-season episode fetching and in-player episode browser
- **Playback** — embedded movies and TV episodes, with a trailer lightbox

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local` in the project root:

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_API_KEY` | yes | TMDB API key. Server-only — never exposed to the browser. |
| `NEXT_PUBLIC_MOVIE_DB_BASE_URL` | yes | Base URL of the video embed host, e.g. `https://embed.example.com`. Used to build iframe `src` values. |
| `NEXT_PUBLIC_MOVIE_DB_LATEST_URL` | no | Used by the "Latest" catalog source. |
| `LIVEKIT_URL` | no | LiveKit server URL. |
| `LIVEKIT_API_KEY` | no | LiveKit API key. |
| `LIVEKIT_API_SECRET` | no | LiveKit API secret. Server-only. |

Anything prefixed with `NEXT_PUBLIC_` is inlined into the client bundle at build time, so never put a secret in one.

Get a TMDB key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint across the project. |

Type-check separately with `npx tsc --noEmit`.

## Project structure

```
app/
  page.tsx                          Home
  movies/                           Movie catalog + /movies/[movieID] detail
  tv-series/                        TV catalog + /tv-series/[seriesID] detail
  discover/[mediaType]/[section]/   Category discovery pages
  api/search/                       Typeahead search route
components/
  catalog/                          Catalog grid, filters, pagination, skeletons
  shared/                           Cross-page components (see below)
  ui/                               shadcn/ui primitives (Base UI backed)
utils/
  tmdb.ts                           TMDB types + detail/season/credits fetchers
  catalog.ts                        Catalog queries, filters, search
  embed.ts                          Video embed URL builders
  getMovies.ts                      Standalone movie fetchers
```

### Shared components

| Component | Responsibility |
| --- | --- |
| `MediaGallery` | Merged stills + posters gallery with a single lightbox spanning every image. |
| `EpisodeList` | Season selector and episode list. Controlled — the parent owns the selected season. |
| `MediaPlayer` | Modal playback shell. Wraps the iframe, metadata bar, and the in-player episode drawer. |
| `MediaCard` / `MediaRow` | Poster card and horizontal scrolling row. |
| `NavBar` / `SearchBar` / `SearchCommand` | Navigation and search surfaces. |

## Architecture notes

A few decisions worth knowing before changing this code.

### Image optimization is disabled

`next.config.ts` sets `images.unoptimized: true`. Vercel's Image Optimization API is not available on the Hobby plan, so every optimized image would fail to load. Images are served straight from TMDB's CDN instead.

This is close to a no-op in practice: TMDB's URL scheme bakes the size into the path (`/t/p/w1280/…`), so the asset is already correctly sized before Next.js would touch it. The trade-off is that you lose automatic WebP/AVIF conversion and responsive `srcset` generation — `sizes` becomes inert. If you upgrade to a plan with image optimization, remove the `unoptimized` flag; `remotePatterns` is still configured and ready.

`priority` is deprecated in Next 16 — use `preload` on above-the-fold images instead.

### Season state is owned by the detail page

`TVSeriesDetailClient` holds `selectedSeason` and passes it into `EpisodeList` as a controlled prop, along with `onSeasonChange`. This matters because `EpisodeList` renders **twice** as a sibling pair: once in the page body and once inside the player drawer's `Sheet`. If the season lived inside `EpisodeList`, the two copies would drift apart and each would reset when unmounted.

Changing the season also resets the player's `currentEpisode` to that season's episode 1, so the hero Play button and the in-player drawer always act on the season currently selected.

Within `EpisodeList`:

- The server-rendered season reads straight from props, so a fresh payload can never be shadowed by a stale cache.
- Other seasons are cached in `Record<season, Episode[]>`, so switching back is instant.
- A request-sequence guard drops out-of-order responses when seasons are switched quickly.
- The skeleton is driven by "episodes unknown" rather than a `loading` flag, which otherwise renders the previous season's episodes for one frame.

The drawer's `Sheet` uses `keepMounted` so its fetched season survives close/reopen. base-ui keeps the popup in the DOM and applies `hidden` while closed.

### Detail page section order

Both detail pages share a deliberate sequence: primary content first (cast, episodes, overview), then **Gallery**, then **More Like This**, then reference data (reviews, providers, production, keywords). Discovery sits above the metadata dump so it is reachable without scrolling past everything.

`MediaGallery` merges the old "Stills" and "Posters & Artwork" subsections into one section. Both blocks stack under a single `Gallery` heading; the sub-labels were removed because the aspect ratios already distinguish them. Every image opens the same lightbox, which walks one combined list — stills first, then posters — so the counter reads `7 / 20` rather than restarting per group.

## Tech stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 |
| Components | shadcn/ui on [Base UI](https://base-ui.com) |
| Icons | lucide-react |
| Data | TMDB API via axios |
| Deployment | Vercel |

## License

Private project. TMDB data is provided by [TMDB](https://www.themoviedb.org/) — this product uses the TMDB API but is not endorsed or certified by TMDB.

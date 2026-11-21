// Custom Worker entry point. It wraps the fetch handler that
// `opennextjs-cloudflare build` generates so we can add two things Next's
// built-in Cloudflare image handler does not do on its own:
//
//  1. Long-lived `Cache-Control` on optimized images. Workers Cache (enabled in
//     wrangler.jsonc) only stores responses that carry caching headers, and
//     OpenNext leaves TMDB images uncached because their upstream response is
//     not `immutable`. Without this every image view re-runs the resize.
//  2. A graceful fallback. When the Cloudflare Images quota is exhausted
//     (error 9422) the handler throws; we redirect to the original TMDB file
//     instead of returning a 500 and breaking the artwork.
//
// `.open-next/worker.js` only exists after a build, so this file is excluded
// from the Next.js type check (see tsconfig.json). `@ts-ignore` (not
// `@ts-expect-error`) is correct here: it must not fail once the module exists.
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore - generated at build time
import openNextWorker from "./.open-next/worker.js";

const IMAGE_PATH = "/_next/image";

// TMDB artwork paths are stable, so the optimized bytes can be cached for a
// month at the edge and in the browser. `stale-while-revalidate` keeps repeat
// views instant while the cache refreshes in the background.
const IMAGE_CACHE_CONTROL =
  "public, max-age=2592000, stale-while-revalidate=604800";

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
};

const handler = openNextWorker as {
  fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: WorkerContext,
  ): Promise<Response>;
};

function isImageRequest(request: Request) {
  const { pathname } = new URL(request.url);
  return pathname === IMAGE_PATH || pathname === `${IMAGE_PATH}/`;
}

/**
 * Builds a redirect to the original TMDB file for an `/_next/image` request.
 * Returns null when the source is not a TMDB image so we never turn this into
 * an open redirect.
 */
function originalArtwork(request: Request): Response | null {
  const src = new URL(request.url).searchParams.get("url");
  if (!src) return null;

  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.hostname !== "image.tmdb.org") {
      return null;
    }
    const response = Response.redirect(url.href, 302);
    // Never store the fallback: once the Images quota resets we want the
    // optimizer to be tried again instead of serving this redirect forever.
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return null;
  }
}

const worker = {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: WorkerContext,
  ): Promise<Response> {
    if (!isImageRequest(request)) {
      return handler.fetch(request, env, ctx);
    }

    // A transform failure (for example the Images quota error 9422) rejects
    // rather than returning a response, so this is the quota path.
    let response: Response;
    try {
      response = await handler.fetch(request, env, ctx);
    } catch (error) {
      const fallback = originalArtwork(request);
      if (fallback) return fallback;
      throw error;
    }

    // Upstream trouble (TMDB timeouts) also degrades to the original file;
    // client errors such as a bad `url` or `w` are passed through untouched.
    if (response.status >= 500) {
      const fallback = originalArtwork(request);
      if (fallback) return fallback;
    }

    // Leave error responses and already-cacheable (immutable) assets alone.
    if (!response.ok || response.headers.has("Cache-Control")) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", IMAGE_CACHE_CONTROL);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default worker;

// The generated worker exposes these Durable Object classes; keep them
// exported so the bundler does not drop them.
// @ts-ignore - generated at build time
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";

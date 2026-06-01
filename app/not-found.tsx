import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <div className="relative mb-8">
        <span className="text-[160px] font-black leading-none tracking-tighter text-white/5 md:text-[220px]">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="h-16 w-16 text-zinc-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-white">Page not found</h1>
      <p className="mb-8 max-w-sm text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded bg-white px-6 py-2.5 text-sm font-bold text-black hover:bg-white/90 transition"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        Back to Home
      </Link>
    </div>
  );
}

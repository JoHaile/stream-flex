export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="h-[85vh] min-h-[520px] w-full bg-zinc-900 animate-pulse" />

      <main className="page-container pb-16">
        <div className="-mt-16 relative z-10 mb-8 rounded-lg bg-zinc-900 p-5 shadow-2xl">
          <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] w-full rounded-sm bg-zinc-900 animate-pulse" />
              <div className="mt-2 space-y-1.5 px-0.5">
                <div className="h-3 w-3/4 bg-zinc-900 rounded animate-pulse" />
                <div className="h-2.5 w-1/2 bg-zinc-900 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

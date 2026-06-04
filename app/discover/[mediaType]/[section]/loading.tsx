import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white pt-16">
      <section className="relative h-[85vh] min-h-[520px] w-full overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-16">
          <div className="mx-auto max-w-7xl">
            <Skeleton className="mb-2 h-4 w-40 bg-zinc-700" />
            <Skeleton className="mb-3 h-16 w-full max-w-2xl bg-zinc-700" />
            <div className="mb-4 flex gap-3">
              <Skeleton className="h-4 w-16 bg-zinc-700" />
              <Skeleton className="h-4 w-20 bg-zinc-700" />
              <Skeleton className="h-4 w-12 bg-zinc-700" />
            </div>
            <Skeleton className="mb-6 h-20 w-full max-w-lg bg-zinc-700" />
            <div className="flex gap-3">
              <Skeleton className="h-11 w-28 rounded bg-zinc-700" />
              <Skeleton className="h-11 w-32 rounded bg-zinc-700" />
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-16">
        <Skeleton className="mb-8 h-14 w-full rounded-lg bg-zinc-900" />

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="aspect-[2/3] w-full rounded-sm bg-zinc-800" />
              <div className="mt-2 px-0.5">
                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                <Skeleton className="mt-1 h-3 w-1/2 bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

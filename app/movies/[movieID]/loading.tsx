import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-6 md:px-6 lg:px-8 lg:pb-[4.5rem] lg:pt-10">
          <Skeleton className="mb-5 h-4 w-36 bg-muted" />
          <Skeleton className="mb-6 h-16 w-full max-w-[420px] bg-muted" />
          <Skeleton className="mb-4 h-7 w-2/3 bg-muted" />
          <div className="mb-6 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-[4.5rem] rounded-full bg-muted" />
            <Skeleton className="h-8 w-[4.5rem] rounded-full bg-muted" />
            <Skeleton className="h-8 w-28 rounded-full bg-muted" />
            <Skeleton className="h-8 w-24 rounded-full bg-muted" />
          </div>
          <Skeleton className="mb-3 h-4 w-full max-w-3xl bg-muted" />
          <Skeleton className="mb-3 h-4 w-full max-w-3xl bg-muted" />
          <Skeleton className="mb-8 h-4 w-full max-w-2xl bg-muted" />
          <div className="mb-8 flex gap-3">
            <Skeleton className="h-10 w-32 bg-muted" />
            <Skeleton className="h-10 w-36 bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-28 rounded-3xl bg-muted"
              />
            ))}
          </div>
        </div>
      </section>

      <main className="page-container pb-20 pt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <Skeleton className="aspect-video w-full rounded-[28px] bg-muted" />
            <div className="grid gap-8 xl:grid-cols-2">
              <Skeleton className="h-80 rounded-[28px] bg-muted" />
              <Skeleton className="h-80 rounded-[28px] bg-muted" />
            </div>
            <Skeleton className="h-72 rounded-[28px] bg-muted" />
            <Skeleton className="h-80 rounded-[28px] bg-muted" />
          </div>

          <div className="space-y-6">
            <Skeleton className="aspect-[2/3] w-full rounded-[28px] bg-muted" />
            <Skeleton className="h-64 rounded-[28px] bg-muted" />
            <Skeleton className="h-56 rounded-[28px] bg-muted" />
            <Skeleton className="h-40 rounded-[28px] bg-muted" />
          </div>
        </div>
      </main>
    </div>
  );
}

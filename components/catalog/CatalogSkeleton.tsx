import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-6 lg:px-8 lg:pb-16 lg:pt-10">
          <Skeleton className="mb-4 h-4 w-28 bg-muted" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <Skeleton className="h-14 w-full max-w-[560px] bg-muted" />
              <Skeleton className="mt-4 h-4 w-full max-w-3xl bg-muted" />
              <Skeleton className="mt-3 h-4 w-full max-w-2xl bg-muted" />
              <div className="mt-6 flex gap-2">
                <Skeleton className="h-8 w-28 rounded-full bg-muted" />
                <Skeleton className="h-8 w-24 rounded-full bg-muted" />
                <Skeleton className="h-8 w-20 rounded-full bg-muted" />
              </div>
            </div>
            <Skeleton className="h-56 rounded-[28px] bg-muted" />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
        <Skeleton className="h-28 rounded-[28px] bg-muted" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={index}
              className="aspect-[0.66] rounded-[28px] bg-muted"
            />
          ))}
        </div>
      </main>
    </div>
  );
}

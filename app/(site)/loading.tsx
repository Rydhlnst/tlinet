import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman publik saat data sedang dimuat: bentuknya mengikuti hero dan deretan kartu. */
export default function SiteLoading() {
  return (
    <div role="status" aria-label="Memuat halaman">
      <div className="border-b bg-gradient-to-b from-brand-soft to-background">
        <div className="container-page flex flex-col items-center gap-5 py-20 sm:py-24">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-11 w-full max-w-xl" />
          <Skeleton className="h-11 w-2/3 max-w-sm" />
          <Skeleton className="mt-2 h-5 w-full max-w-lg" />
          <Skeleton className="h-5 w-3/4 max-w-md" />
        </div>
      </div>
      <div className="container-page grid gap-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex flex-col gap-4 rounded-3xl border p-6">
            <Skeleton className="size-11 rounded-2xl" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

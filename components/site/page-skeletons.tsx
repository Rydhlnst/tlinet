import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Kotak muat di atas latar gelap hero. */
function DarkBlock({ className }: { className?: string }) {
  return <Skeleton className={cn("skeleton-dark bg-white/10", className)} />;
}

/** Kerangka hero halaman dalam (PageHero): latar gelap, label, judul, dan deskripsi di tengah. */
export function PageHeroSkeleton() {
  return (
    <section className="surface-ink hero-under-header relative overflow-hidden">
      <div className="container-page flex flex-col items-center gap-5 py-20 sm:py-24">
        <DarkBlock className="h-3.5 w-36" />
        <DarkBlock className="h-10 w-full max-w-xl" />
        <DarkBlock className="h-10 w-2/3 max-w-sm" />
        <DarkBlock className="mt-1 h-4 w-full max-w-lg" />
        <DarkBlock className="h-4 w-3/4 max-w-md" />
      </div>
    </section>
  );
}

/** Kerangka judul bagian di tengah (label, judul, deskripsi). */
export function SectionHeadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-lg" />
    </div>
  );
}

/** Kerangka kartu berikon (fitur, keunggulan, bantuan). */
export function IconCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-3xl border bg-card p-6", className)}>
      <Skeleton className="size-11 rounded-2xl" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-5/6" />
    </div>
  );
}

/** Kerangka kartu berita: sampul, label, judul, ringkasan. */
export function ArticleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

/** Kerangka form (isian berlabel dan tombol kirim). */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <Skeleton className="h-6 w-48" />
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="mt-2 h-11 w-full rounded-full" />
    </div>
  );
}

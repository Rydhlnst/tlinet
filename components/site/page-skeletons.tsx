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

/** Kerangka hero beranda: teks rata kiri, dua tombol, lalu deretan angka. */
export function HomeHeroSkeleton() {
  return (
    <section className="hero-under-header relative overflow-hidden bg-ink">
      <div className="container-page flex flex-col gap-6 py-24 sm:py-32">
        <DarkBlock className="h-7 w-48 rounded-full" />
        <div className="flex flex-col gap-3">
          <DarkBlock className="h-12 w-full max-w-md" />
          <DarkBlock className="h-12 w-4/5 max-w-sm" />
          <DarkBlock className="h-12 w-3/5 max-w-xs" />
        </div>
        <DarkBlock className="h-4 w-full max-w-lg" />
        <DarkBlock className="h-4 w-3/4 max-w-md" />
        <div className="flex gap-3">
          <DarkBlock className="h-11 w-40 rounded-full" />
          <DarkBlock className="h-11 w-36 rounded-full" />
        </div>
        <div className="mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <DarkBlock key={item} className="h-16 rounded-2xl" />
          ))}
        </div>
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

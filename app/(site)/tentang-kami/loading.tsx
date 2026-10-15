import { IconCardSkeleton, PageHeroSkeleton, SectionHeadingSkeleton } from "@/components/site/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman tentang kami: hero, dua kartu profil, lalu deretan nilai perusahaan. */
export default function AboutLoading() {
  return (
    <div role="status" aria-label="Memuat halaman tentang kami">
      <PageHeroSkeleton />
      <section className="border-y bg-muted/40">
        <div className="container-page grid gap-5 py-20 sm:py-24 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="flex flex-col gap-4 rounded-3xl border bg-card p-8">
              <Skeleton className="size-11 rounded-2xl" />
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </section>
      <section className="container-page py-20 sm:py-24">
        <SectionHeadingSkeleton />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <IconCardSkeleton key={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

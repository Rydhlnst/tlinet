import { IconCardSkeleton, PageHeroSkeleton, SectionHeadingSkeleton } from "@/components/site/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman bantuan: hero, kartu kontak yang menumpang di bawahnya, lalu daftar FAQ. */
export default function HelpLoading() {
  return (
    <div role="status" aria-label="Memuat halaman bantuan">
      <PageHeroSkeleton />
      <section className="container-page relative z-10 -mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <IconCardSkeleton key={item} className="shadow-lg shadow-primary/5" />
        ))}
      </section>
      <section className="container-page py-20 sm:py-24">
        <SectionHeadingSkeleton />
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    </div>
  );
}

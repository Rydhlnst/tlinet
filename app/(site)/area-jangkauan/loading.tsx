import { FormSkeleton, PageHeroSkeleton } from "@/components/site/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman area jangkauan: hero, peta dengan kotak cari, lalu form cek area. */
export default function CoverageLoading() {
  return (
    <div role="status" aria-label="Memuat peta jangkauan">
      <PageHeroSkeleton />
      <section className="container-page relative z-10 -mt-10 pb-20 sm:pb-24">
        <div className="overflow-hidden rounded-3xl border bg-card p-3 shadow-xl shadow-primary/5">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-[22rem] w-full rounded-2xl sm:h-[28rem]" />
        </div>
      </section>
      <section className="border-y bg-muted/40">
        <div className="container-page grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-4/5 max-w-sm" />
          </div>
          <FormSkeleton fields={4} />
        </div>
      </section>
    </div>
  );
}

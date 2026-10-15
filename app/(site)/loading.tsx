import { HomeHeroSkeleton, IconCardSkeleton, SectionHeadingSkeleton } from "@/components/site/page-skeletons";

/** Kerangka beranda (dan cadangan halaman publik lain): hero gelap, lalu judul bagian dan deretan kartu. */
export default function SiteLoading() {
  return (
    <div role="status" aria-label="Memuat halaman">
      <HomeHeroSkeleton />
      <div className="container-page py-20 sm:py-24">
        <SectionHeadingSkeleton />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <IconCardSkeleton key={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

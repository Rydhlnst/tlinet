import { ArticleCardSkeleton, PageHeroSkeleton } from "@/components/site/page-skeletons";

/** Kerangka daftar berita: hero, lalu kisi kartu artikel. */
export default function NewsLoading() {
  return (
    <div role="status" aria-label="Memuat berita">
      <PageHeroSkeleton />
      <section className="container-page pt-16 pb-20 sm:pt-20 sm:pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <ArticleCardSkeleton key={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

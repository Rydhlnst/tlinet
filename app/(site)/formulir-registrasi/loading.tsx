import { FormSkeleton, PageHeroSkeleton } from "@/components/site/page-skeletons";

/** Kerangka formulir registrasi: hero, lalu kartu form yang menumpang di bawahnya. */
export default function RegisterLoading() {
  return (
    <div role="status" aria-label="Memuat formulir">
      <PageHeroSkeleton />
      <section className="container-page relative z-10 -mt-10 max-w-2xl pb-20 sm:pb-24">
        <FormSkeleton fields={6} />
      </section>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman artikel: tautan kembali, judul, sampul, lalu paragraf. */
export default function ArticleLoading() {
  return (
    <div className="container-page max-w-3xl pt-12 pb-20 sm:pt-16" role="status" aria-label="Memuat artikel">
      <Skeleton className="h-4 w-36" />
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-1 h-5 w-full" />
      </div>
      <Skeleton className="mt-10 aspect-[16/9] w-full rounded-3xl" />
      <div className="mt-10 flex flex-col gap-3">
        {["w-full", "w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((width, index) => (
          <Skeleton key={index} className={`h-4 ${width}`} />
        ))}
      </div>
    </div>
  );
}

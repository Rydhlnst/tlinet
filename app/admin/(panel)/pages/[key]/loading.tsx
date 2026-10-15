import { HeadingSkeleton } from "@/components/admin/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka editor halaman: daftar bagian di kiri, isian form di kanan. */
export default function PageEditorLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Memuat editor halaman">
      <HeadingSkeleton buttons={2} />
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_1fr]">
        <div className="flex gap-2 lg:flex-col">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-9 w-28 shrink-0 rounded-lg lg:w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

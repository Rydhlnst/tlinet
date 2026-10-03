import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka isi dashboard saat berpindah menu: judul, kartu ringkas, lalu baris tabel. */
export default function PanelLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Memuat">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-3">
          <Skeleton className="h-8 w-full max-w-xs" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-b-0">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="hidden h-5 w-24 rounded-full sm:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
            <Skeleton className="ml-auto h-7 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

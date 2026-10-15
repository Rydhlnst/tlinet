import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman cetak invoice: bilah tombol, lalu lembar A4. */
export default function InvoiceLoading() {
  return (
    <div className="min-h-screen bg-muted/50 px-4 py-6 sm:px-8" role="status" aria-label="Memuat invoice">
      <div className="mx-auto flex w-full max-w-[210mm] flex-wrap justify-between gap-3">
        <Skeleton className="h-10 w-44 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <div className="mx-auto mt-6 flex w-full max-w-[210mm] flex-col gap-8 rounded-sm bg-white p-10 shadow-lg" style={{ aspectRatio: "210 / 297" }}>
        <div className="flex justify-between gap-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="flex w-64 flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
            <Skeleton className="mt-3 h-16 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="ml-auto h-20 w-2/5" />
      </div>
    </div>
  );
}

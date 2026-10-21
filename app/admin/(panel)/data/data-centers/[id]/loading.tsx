import { HeadingSkeleton, InfoListSkeleton, PanelSkeleton, TableSkeleton } from "@/components/admin/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka halaman detail Data Center: profil, dua panel informasi, grafik MRTG, lalu riwayat pembayaran. */
export default function DataCenterLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Memuat Data Center">
      <Skeleton className="h-4 w-48" />
      <HeadingSkeleton buttons={2} />
      <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-6 lg:ml-12">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PanelSkeleton action={false}>
          <InfoListSkeleton rows={9} />
        </PanelSkeleton>
        <PanelSkeleton action={false}>
          <InfoListSkeleton rows={10} />
        </PanelSkeleton>
      </div>
      {[0, 1].map((panel) => (
        <PanelSkeleton key={panel}>
          <TableSkeleton rows={3} columns={6} search={false} className="rounded-none border-0" />
        </PanelSkeleton>
      ))}
    </div>
  );
}

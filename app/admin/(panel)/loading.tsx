import { HeadingSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/admin/loading-skeletons";

/** Kerangka isi dashboard saat berpindah menu: judul, kartu ringkas, lalu baris tabel. */
export default function PanelLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Memuat">
      <HeadingSkeleton />
      <StatCardsSkeleton />
      <TableSkeleton />
    </div>
  );
}

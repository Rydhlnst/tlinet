import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka isi tab saat berpindah tab; header dan navigasi bawah tetap tampil. */
export default function SubnetPortalLoading() {
  return (
    <>
      <Skeleton className="h-36 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </>
  );
}

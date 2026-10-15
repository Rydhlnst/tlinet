import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Kerangka judul halaman dashboard: judul, deskripsi, dan tombol di kanan. */
export function HeadingSkeleton({ buttons = 1 }: { buttons?: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: buttons }, (_, index) => (
          <Skeleton key={index} className="h-10 w-36 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Kerangka kartu ringkas (angka besar dengan ikon kecil). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Lebar sel bergantian agar kerangka tabel tidak terlihat seperti kisi kaku. */
const cellWidths = ["w-40", "w-24", "w-28", "w-32", "w-20", "w-24", "w-16"];

/** Kerangka tabel: kotak cari, baris judul, lalu baris data. */
export function TableSkeleton({ rows = 8, columns = 6, search = true, className }: { rows?: number; columns?: number; search?: boolean; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      {search && (
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
          <Skeleton className="hidden h-3 w-20 sm:block" />
        </div>
      )}
      <div className="flex items-center gap-6 border-b bg-muted/30 px-4 py-3">
        {Array.from({ length: columns }, (_, column) => (
          <Skeleton key={column} className={cn("h-3", column > 2 && "hidden md:block", cellWidths[column % cellWidths.length])} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        // Baris makin bawah makin pudar, seperti isi yang memudar ke bawah.
        <div key={row} className="flex items-center gap-6 border-b px-4 py-3.5 last:border-b-0" style={{ opacity: 1 - row * (0.6 / rows) }}>
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton
              key={column}
              className={cn(column === 0 ? "h-4" : "h-3.5", column > 2 && "hidden md:block", cellWidths[(column + row) % cellWidths.length])}
            />
          ))}
          <Skeleton className="ml-auto size-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Kerangka panel berjudul ikon (seperti di halaman detail pelanggan). */
export function PanelSkeleton({ children, action = true }: { children: React.ReactNode; action?: boolean }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-40" />
        </div>
        {action && <Skeleton className="h-9 w-32 rounded-lg" />}
      </div>
      {children}
    </div>
  );
}

/** Kerangka daftar label–nilai dua kolom. */
export function InfoListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-3.5 p-5">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="contents">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className={cn("h-3.5", cellWidths[row % cellWidths.length])} />
        </div>
      ))}
    </div>
  );
}

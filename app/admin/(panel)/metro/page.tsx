import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateMetroButton, MetroOrderButton } from "@/components/admin/metro-manager";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { customers, metroOrders } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { isMetroKind, metroKindLabels, metroProgress, type MetroStatus } from "@/lib/metro";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progres Metro" };

const filters: { key: string; label: string; status?: MetroStatus }[] = [
  { key: "", label: "Berjalan", status: "active" },
  { key: "selesai", label: "Selesai", status: "done" },
  { key: "ditolak", label: "Ditolak", status: "rejected" },
  { key: "semua", label: "Semua" },
];

/** Pemasangan baru dan upgrade kapasitas pelanggan; tiap langkah yang ditandai di sini terlihat pelanggan di portal Subnet. */
export default async function MetroPage({ searchParams }: PageProps<"/admin/metro">) {
  await requireAdmin();
  const requested = (await searchParams).status;
  const filter = filters.find((item) => item.key === requested) ?? filters[0];
  const db = requireDb();
  const [orders, customerList] = await Promise.all([
    db
      .select({ order: metroOrders, name: customers.name, company: customers.company })
      .from(metroOrders)
      .innerJoin(customers, eq(customers.id, metroOrders.customerId))
      .orderBy(desc(metroOrders.updatedAt)),
    db.select({ id: customers.id, name: customers.name, company: customers.company, capacity: customers.capacity }).from(customers).orderBy(asc(customers.name)),
  ]);
  const counts = { active: 0, done: 0, rejected: 0 } as Record<MetroStatus, number>;
  for (const { order } of orders) counts[order.status as MetroStatus] = (counts[order.status as MetroStatus] ?? 0) + 1;
  const rows = orders.filter(({ order }) => isMetroKind(order.kind) && (!filter.status || order.status === filter.status));

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progres Metro</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tahapan pemasangan baru dan upgrade kapasitas. Setiap langkah yang ditandai selesai di sini langsung terlihat pelanggan di portal Subnet, lengkap dengan hari, tanggal, dan jamnya. Permintaan upgrade dari
            pelanggan masuk ke daftar Berjalan.
          </p>
        </div>
        <CreateMetroButton customers={customerList.map((customer) => ({ id: customer.id, title: customer.company ? `${customer.company} (${customer.name})` : customer.name, capacity: customer.capacity }))} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <nav className="flex gap-1 border-b p-2" aria-label="Saring status">
          {filters.map((item) => (
            <Link
              key={item.key}
              href={item.key ? `/admin/metro?status=${item.key}` : "/admin/metro"}
              aria-current={item === filter ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", item === filter ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {item.label}
              {item.status && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{counts[item.status]}</span>}
            </Link>
          ))}
        </nav>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Pelanggan</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Kapasitas</TableHead>
              <TableHead>Progres</TableHead>
              <TableHead>Langkah berikutnya</TableHead>
              <TableHead>Diperbarui</TableHead>
              <TableHead className="pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ order, name, company }) => {
              const kind = order.kind as "install" | "upgrade";
              const progress = metroProgress(kind, order.steps);
              const title = company || name;
              return (
                <TableRow key={order.id}>
                  <TableCell className="pl-4">
                    <Link href={`/admin/data/customers/${order.customerId}`} className="font-medium underline-offset-4 hover:underline">
                      {title}
                    </Link>
                    {company && <span className="block text-xs text-muted-foreground">{name}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={kind === "upgrade" ? "secondary" : "outline"}>{metroKindLabels[kind]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{kind === "upgrade" ? `${order.previousCapacity || "?"} → ${order.capacity}` : order.capacity || "—"}</TableCell>
                  <TableCell className="min-w-40">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", order.status === "done" ? "bg-emerald-500" : "bg-brand")} style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-muted-foreground">{progress.last?.label}</span>
                  </TableCell>
                  <TableCell>
                    {order.status === "rejected" ? (
                      <Badge variant="destructive">Ditolak</Badge>
                    ) : progress.next ? (
                      <span className="text-sm font-medium">{progress.next.label}</span>
                    ) : (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Selesai</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(order.updatedAt)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <MetroOrderButton
                      customerTitle={title}
                      order={{ id: order.id, kind, capacity: order.capacity, previousCapacity: order.previousCapacity, steps: order.steps, status: order.status as MetroStatus, rejectReason: order.rejectReason, note: order.note }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {filter.status === "active" ? "Tidak ada progres yang sedang berjalan." : "Belum ada progres."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

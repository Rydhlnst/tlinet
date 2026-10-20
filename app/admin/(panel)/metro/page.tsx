import { asc, desc, eq } from "drizzle-orm";
import { CircleCheck, CircleX, Layers, Route, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateMetroButton, MetroOrderButton } from "@/components/admin/metro-manager";
import { PageHero, StatCard, StatGrid } from "@/components/admin/page-hero";
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
  await requireAdmin("metro");
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
  const total = orders.filter(({ order }) => isMetroKind(order.kind)).length;

  return (
    <>
      <PageHero
        title="Progres Metro"
        icon={Route}
        description="Tahapan pemasangan baru dan upgrade kapasitas. Setiap langkah yang ditandai selesai di sini langsung terlihat pelanggan di portal Subnet, lengkap dengan hari, tanggal, dan jamnya. Permintaan upgrade dari pelanggan masuk ke daftar Berjalan."
        actions={<CreateMetroButton customers={customerList.map((customer) => ({ id: customer.id, title: customer.company ? `${customer.company} (${customer.name})` : customer.name, capacity: customer.capacity }))} />}
      />

      <StatGrid>
        <StatCard tone="blue" icon={Settings2} label="Berjalan" value={counts.active} hint="Sedang dikerjakan" progress={total ? counts.active / total : 0} href="/admin/metro" />
        <StatCard tone="green" icon={CircleCheck} label="Selesai" value={counts.done} hint="Sudah done" progress={total ? counts.done / total : 0} href="/admin/metro?status=selesai" />
        <StatCard tone="red" icon={CircleX} label="Ditolak" value={counts.rejected} hint="Tidak dilanjutkan" progress={total ? counts.rejected / total : 0} href="/admin/metro?status=ditolak" />
        <StatCard tone="purple" icon={Layers} label="Semua" value={total} hint="Pemasangan dan upgrade" progress={total ? 1 : 0} href="/admin/metro?status=semua" />
      </StatGrid>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)]">
        <nav className="flex gap-1.5 overflow-x-auto border-b p-3" aria-label="Saring status">
          {filters.map((item) => (
            <Link
              key={item.key}
              href={item.key ? `/admin/metro?status=${item.key}` : "/admin/metro"}
              aria-current={item === filter ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap",
                item === filter ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_rgba(37,99,235,0.8)]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
              <span className={cn("rounded-md px-1.5 text-xs tabular-nums", item === filter ? "bg-white/20" : "bg-muted")}>{item.status ? counts[item.status] : total}</span>
            </Link>
          ))}
        </nav>
        {/* HP: satu kartu per progres. */}
        <ul className="divide-y md:hidden">
          {rows.map(({ order, name, company }) => {
            const kind = order.kind as "install" | "upgrade";
            const progress = metroProgress(kind, order.steps);
            return (
              <li key={order.id} className="flex flex-col gap-2.5 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{company || name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {metroKindLabels[kind]} · {kind === "upgrade" ? `${order.previousCapacity || "?"} → ${order.capacity}` : order.capacity || "—"}
                    </p>
                  </div>
                  {order.status === "rejected" ? <Badge variant="destructive">Ditolak</Badge> : progress.next ? <Badge variant="secondary">{progress.completed}/{progress.total}</Badge> : <Badge className="bg-emerald-600 hover:bg-emerald-600">Selesai</Badge>}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", order.status === "done" ? "bg-emerald-500" : "bg-brand")} style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs text-muted-foreground">{progress.next && order.status !== "rejected" ? <>Berikutnya: <span className="font-medium text-foreground">{progress.next.label}</span></> : formatDateTime(order.updatedAt)}</p>
                  <MetroOrderButton
                    customerTitle={company || name}
                    order={{ id: order.id, kind, capacity: order.capacity, previousCapacity: order.previousCapacity, steps: order.steps, status: order.status as MetroStatus, rejectReason: order.rejectReason, note: order.note }}
                  />
                </div>
              </li>
            );
          })}
          {rows.length === 0 && <li className="px-4 py-12 text-center text-sm text-muted-foreground">{filter.status === "active" ? "Tidak ada progres yang sedang berjalan." : "Belum ada progres."}</li>}
        </ul>
        <Table className="max-md:hidden">
          <TableHeader className="bg-[#f3f6fc] dark:bg-white/5">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-5">No</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Kapasitas</TableHead>
              <TableHead>Progres</TableHead>
              <TableHead>Langkah berikutnya</TableHead>
              <TableHead>Diperbarui</TableHead>
              <TableHead className="pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ order, name, company }, index) => {
              const kind = order.kind as "install" | "upgrade";
              const progress = metroProgress(kind, order.steps);
              const title = company || name;
              return (
                <TableRow key={order.id}>
                  <TableCell className="pl-5 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="py-3">
                    <Link href={`/admin/data/customers/${order.customerId}`} className="font-medium underline-offset-4 hover:underline">
                      {title}
                    </Link>
                    {company && <span className="block text-xs text-muted-foreground">{name}</span>}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                        kind === "upgrade" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-brand-soft text-brand-ink",
                      )}
                    >
                      {metroKindLabels[kind]}
                    </span>
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
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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

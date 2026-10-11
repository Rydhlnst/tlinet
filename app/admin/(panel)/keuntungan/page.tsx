import { asc } from "drizzle-orm";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { customerStatusLabels } from "@/lib/cms/entities";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Selisih Keuntungan" };

function Stat({ label, value, hint, tone }: { label: string; value: number; hint: string; tone?: "profit" }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums", tone === "profit" && (value < 0 ? "text-destructive" : "text-emerald-700"))}>{formatRupiah(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const money = (value: number) => (value ? formatRupiah(value) : <span className="text-muted-foreground">—</span>);

/**
 * Selisih keuntungan per pelanggan: biaya bulanan ke ISP dikurangi biaya bulanan ke NAP.
 * Tidak ada yang disimpan di sini; angkanya selalu dihitung dari Data Pelanggan.
 */
export default async function ProfitPage({ searchParams }: PageProps<"/admin/keuntungan">) {
  await requireAdmin();
  const query = (await searchParams).q;
  const keywords = ((Array.isArray(query) ? query[0] : query) ?? "").trim().slice(0, 80);

  const all = (
    await requireDb()
      .select({
        id: customers.id,
        name: customers.name,
        company: customers.company,
        siteId: customers.siteId,
        status: customers.status,
        ispFee: customers.monthlyFee,
        napFee: customers.napFee,
      })
      .from(customers)
      .orderBy(asc(customers.name))
  ).map((row) => ({ ...row, filled: row.ispFee > 0 || row.napFee > 0, profit: row.ispFee - row.napFee }));

  // Ringkasan hanya menghitung pelanggan aktif; yang belum aktif, suspend, atau relokasi tidak sedang ditagih.
  const active = all.filter((row) => row.status === "active" && row.filled);
  const total = (pick: (row: (typeof all)[number]) => number) => active.reduce((sum, row) => sum + pick(row), 0);

  const term = keywords.toLowerCase();
  const rows = all
    .filter((row) => !term || `${row.name} ${row.company} ${row.siteId}`.toLowerCase().includes(term))
    // Yang biayanya sudah diisi lebih dulu, dari keuntungan terbesar.
    .sort((a, b) => Number(b.filled) - Number(a.filled) || b.profit - a.profit);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Selisih Keuntungan</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Keuntungan per bulan tiap pelanggan: biaya bulanan ke ISP dikurangi biaya bulanan ke NAP. Angkanya otomatis mengikuti Data Pelanggan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Biaya bulanan ke ISP" value={total((row) => row.ispFee)} hint={`Dari ${active.length} pelanggan aktif yang biayanya sudah diisi`} />
        <Stat label="Biaya bulanan ke NAP" value={total((row) => row.napFee)} hint="Yang dibayar ke NAP untuk pelanggan itu" />
        <Stat label="Selisih keuntungan per bulan" value={total((row) => row.profit)} hint="Biaya ke ISP dikurangi biaya ke NAP" tone="profit" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <form className="relative w-full max-w-xs" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={keywords} placeholder="Cari pelanggan…" aria-label="Cari pelanggan" className="pl-8" />
          </form>
          <p className="shrink-0 text-xs text-muted-foreground">
            {rows.length} dari {all.length} pelanggan
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">PT</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Site ID</TableHead>
              <TableHead>Biaya ke ISP</TableHead>
              <TableHead>Biaya ke NAP</TableHead>
              <TableHead>Selisih Keuntungan</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-4">{row.company || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/admin/data/customers/${row.id}`} className="underline-offset-4 hover:underline">
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>{row.siteId || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{money(row.ispFee)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{money(row.napFee)}</TableCell>
                <TableCell className={cn("font-semibold whitespace-nowrap tabular-nums", row.filled && (row.profit < 0 ? "text-destructive" : "text-emerald-700"))}>
                  {row.filled ? formatRupiah(row.profit) : <span className="font-normal text-muted-foreground">Belum diisi</span>}
                </TableCell>
                <TableCell className="pr-4">
                  <Badge variant={row.status === "active" ? "default" : row.status === "suspended" ? "destructive" : "secondary"}>{customerStatusLabels[row.status] ?? row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {keywords ? "Tidak ada pelanggan yang cocok dengan pencarian." : "Belum ada pelanggan."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

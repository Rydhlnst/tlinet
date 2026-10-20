import { asc } from "drizzle-orm";
import { Building2, Search, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, StatCard } from "@/components/admin/page-hero";
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

const money = (value: number) => (value ? formatRupiah(value) : <span className="text-muted-foreground">—</span>);

/**
 * Selisih keuntungan per pelanggan: biaya bulanan ke ISP dikurangi biaya bulanan ke NAP.
 * Tidak ada yang disimpan di sini; angkanya selalu dihitung dari Data Pelanggan.
 */
export default async function ProfitPage({ searchParams }: PageProps<"/admin/keuntungan">) {
  await requireAdmin("finance");
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
      <PageHero
        title="Selisih Keuntungan"
        icon={TrendingUp}
        description="Keuntungan per bulan tiap pelanggan: biaya bulanan ke ISP dikurangi biaya bulanan ke NAP. Angkanya otomatis mengikuti Data Pelanggan."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="blue" icon={Wallet} label="Biaya bulanan ke ISP" value={formatRupiah(total((row) => row.ispFee))} hint={`Dari ${active.length} pelanggan aktif yang biayanya sudah diisi`} />
        <StatCard tone="orange" icon={Building2} label="Biaya bulanan ke NAP" value={formatRupiah(total((row) => row.napFee))} hint="Yang dibayar ke NAP untuk pelanggan itu" />
        <StatCard
          tone={total((row) => row.profit) < 0 ? "red" : "green"}
          icon={TrendingUp}
          label="Selisih keuntungan per bulan"
          value={formatRupiah(total((row) => row.profit))}
          hint="Biaya ke ISP dikurangi biaya ke NAP"
        />
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
        {/* HP: satu kartu per pelanggan dengan angka utamanya. */}
        <ul className="divide-y md:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/data/customers/${row.id}`} className="flex flex-col gap-2 px-4 py-3 active:bg-muted/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.company || row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{[row.company && row.name, row.siteId].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <p className={cn("shrink-0 text-sm font-semibold tabular-nums", row.filled ? (row.profit < 0 ? "text-destructive" : "text-emerald-700") : "font-normal text-muted-foreground")}>
                    {row.filled ? formatRupiah(row.profit) : "Belum diisi"}
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
                  <span>ISP {money(row.ispFee)}</span>
                  <span>NAP {money(row.napFee)}</span>
                </div>
              </Link>
            </li>
          ))}
          {rows.length === 0 && <li className="px-4 py-12 text-center text-sm text-muted-foreground">{keywords ? "Tidak ada pelanggan yang cocok dengan pencarian." : "Belum ada pelanggan."}</li>}
        </ul>
        <Table className="max-md:hidden">
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

import { asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { Download, ExternalLink, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SubnetAccessButton, SubnetPortsProvider } from "@/components/admin/subnet-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { customers, invoices, subnetAccounts } from "@/lib/db/schema";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { librenmsConfigured, listLibrenmsPorts, suggestPort } from "@/lib/librenms";
import { absoluteUrl } from "@/lib/seo";
import { androidApk } from "@/lib/subnet";

export const metadata: Metadata = { title: "Subnet" };

const empty = <span className="text-muted-foreground">—</span>;

/**
 * Akses portal Subnet per pelanggan. Daftar pelanggannya dari Data Pelanggan dan jumlah invoicenya dari menu Invoice;
 * yang disimpan di sini hanya email, kata sandi, status akses, dan port LibreNMS untuk grafik trafiknya.
 */
export default async function SubnetPage({ searchParams }: PageProps<"/admin/subnet">) {
  await requireAdmin();
  const query = (await searchParams).q;
  const keywords = ((Array.isArray(query) ? query[0] : query) ?? "").trim().slice(0, 80);
  const db = requireDb();

  const [all, invoiceStats, invoiceEmails, ports] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
        company: customers.company,
        phone: customers.phone,
        siteId: customers.siteId,
        vlan: customers.vlan,
        ipAddress: customers.ipAddress,
        pingTarget: subnetAccounts.pingTarget,
        email: subnetAccounts.email,
        portId: subnetAccounts.librenmsPortId,
        active: subnetAccounts.active,
        lastLoginAt: subnetAccounts.lastLoginAt,
      })
      .from(customers)
      .leftJoin(subnetAccounts, eq(subnetAccounts.customerId, customers.id))
      .orderBy(asc(customers.company), asc(customers.name)),
    db
      .select({
        customerId: invoices.customerId,
        total: count(),
        unpaid: sql<number>`count(*) filter (where ${invoices.status} <> 'paid')`.mapWith(Number),
        unpaidAmount: sql<number>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} <> 'paid'), 0)`.mapWith(Number),
      })
      .from(invoices)
      .groupBy(invoices.customerId),
    // Usulan email akses: email di invoice terbaru pelanggan.
    db.select({ customerId: invoices.customerId, email: invoices.email }).from(invoices).where(ne(invoices.email, "")).orderBy(desc(invoices.issueDate)),
    librenmsConfigured() ? listLibrenmsPorts() : Promise.resolve([]),
  ]);
  const portName = new Map(ports.map((port) => [port.portId, port.name]));
  const emailOf = new Map<string, string>();
  for (const row of invoiceEmails) if (!emailOf.has(row.customerId)) emailOf.set(row.customerId, row.email);
  const statsOf = new Map(invoiceStats.map((row) => [row.customerId, row]));
  const portalUrl = absoluteUrl("/subnet/login");

  const term = keywords.toLowerCase();
  const rows = all
    .map((row) => ({ ...row, title: row.company || row.name }))
    .filter((row) => !term || `${row.name} ${row.company} ${row.siteId} ${row.email ?? ""}`.toLowerCase().includes(term))
    // Yang sudah punya akses lebih dulu.
    .sort((a, b) => Number(Boolean(b.email)) - Number(Boolean(a.email)) || a.title.localeCompare(b.title, "id"));
  const withAccess = all.filter((row) => row.email && row.active).length;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subnet</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Akses portal pelanggan. Pelanggan masuk dengan email dan kata sandi dari sini, lalu bisa melihat data layanan, grafik trafik, invoice, dan history pembayarannya sendiri. {withAccess} dari {all.length}{" "}
            pelanggan punya akses aktif.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {/* Tautan APK bisa dibagikan ke pelanggan lewat WhatsApp. */}
          <Button asChild variant="outline" size="lg">
            <a href={androidApk.path} download>
              <Download />
              APK Android
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/subnet/login" target="_blank">
              <ExternalLink />
              Buka portal
            </Link>
          </Button>
        </div>
      </div>

      <SubnetPortsProvider ports={ports.length ? ports : null}>
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
              <TableHead className="pl-4">Pelanggan</TableHead>
              <TableHead>Site ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Akses</TableHead>
              <TableHead>Grafik trafik</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Login terakhir</TableHead>
              <TableHead className="pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const stats = statsOf.get(row.id);
              return (
                <TableRow key={row.id}>
                  <TableCell className="pl-4">
                    <Link href={`/admin/data/customers/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                      {row.title}
                    </Link>
                    {row.company && <span className="block text-xs text-muted-foreground">{row.name}</span>}
                  </TableCell>
                  <TableCell>{row.siteId || empty}</TableCell>
                  <TableCell className="text-sm">{row.email || empty}</TableCell>
                  <TableCell>
                    {row.email ? <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Aktif" : "Nonaktif"}</Badge> : <Badge variant="outline">Belum ada</Badge>}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-xs" title={row.portId ? portName.get(row.portId) : undefined}>
                    {row.portId ? (portName.get(row.portId) ?? `Port #${row.portId}`) : empty}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {stats ? (
                      <>
                        {stats.total} invoice
                        {stats.unpaid > 0 && <span className="block text-xs text-destructive">{stats.unpaid} unpaid · {formatRupiah(stats.unpaidAmount)}</span>}
                      </>
                    ) : (
                      empty
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "—"}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <SubnetAccessButton
                      customer={{ id: row.id, title: row.title, phone: row.phone, email: emailOf.get(row.id) ?? "", portId: suggestPort(row.vlan, ports)?.portId ?? null, ip: row.ipAddress.split(/[\s/,]/)[0] ?? "" }}
                      account={row.email ? { email: row.email, active: Boolean(row.active), portId: row.portId, pingTarget: row.pingTarget ?? "" } : null}
                      portalUrl={portalUrl}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  {keywords ? "Tidak ada pelanggan yang cocok dengan pencarian." : "Belum ada pelanggan di Data Pelanggan."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </SubnetPortsProvider>
    </>
  );
}

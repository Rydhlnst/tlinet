import { desc, eq } from "drizzle-orm";
import { Activity, ArrowDown, ArrowUp, FileText, Gauge, LogOut, MapPin, ReceiptText, ScrollText, User, Wifi } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { customerTones, InfoList, Panel, StatusPill } from "@/components/admin/detail-panels";
import { Brand } from "@/components/site/brand";
import { RealtimeTraffic } from "@/components/site/realtime-traffic";
import { SubnetPing } from "@/components/site/subnet-ping";
import { TowerMap } from "@/components/site/tower-map";
import { SubnetAddressButton, SubnetPhoto } from "@/components/site/subnet-profile";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerStatusLabels, paymentStatusLabels } from "@/lib/cms/entities";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customerPayments, customers, invoices } from "@/lib/db/schema";
import { formatBitrate, formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { invoicePublicPath } from "@/lib/invoices";
import { getPortTraffic, realtimeConfigured, trafficRanges, type TrafficRange } from "@/lib/librenms";
import { requireSubnetUser } from "@/lib/subnet";
import { cn } from "@/lib/utils";
import { subnetLogoutAction } from "./actions";

export const metadata: Metadata = { title: "Portal Subnet", robots: { index: false } };

/** Tanggal hari ini (YYYY-MM-DD) menurut WITA, zona waktu kantor di Bulukumba. */
const todayWita = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

const fileLink = (url: string, label: string) =>
  url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-ink underline-offset-4 hover:underline">
      {label}
    </a>
  ) : (
    ""
  );

const empty = <span className="text-muted-foreground">—</span>;

/**
 * Portal pelanggan: data pelanggan (tanpa biaya ke NAP, selisih keuntungan, dan no. pembayaran), invoice, dan history pembayarannya.
 * Semuanya hanya bisa dilihat; yang bisa diubah pelanggan hanya foto profil dan alamat.
 */
const timeFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" });

/** Kecepatan terakhir dan grafik trafik port pelanggan dari LibreNMS. Download = trafik keluar port menuju pelanggan. */
type TrafficView = TrafficRange | "realtime";

async function TrafficPanel({ portId, view }: { portId: number | null; view: TrafficView }) {
  const realtime = view === "realtime";
  const range: TrafficRange = realtime ? "day" : view;
  const traffic = portId && !realtime ? await getPortTraffic(portId) : null;
  // "Real time" hanya muncul bila server punya user LibreNMS untuk membaca router secara langsung.
  const tabs: { key: TrafficView; label: string }[] = [
    ...(realtimeConfigured() ? [{ key: "realtime" as const, label: "Real time" }] : []),
    ...(Object.keys(trafficRanges) as TrafficRange[]).map((key) => ({ key, label: trafficRanges[key].label })),
  ];
  return (
    <Panel
      icon={Activity}
      title="Trafik Internet"
      action={
        portId ? (
          <nav className="flex rounded-lg border p-0.5 text-xs" aria-label="Rentang grafik">
            {tabs.map(({ key, label }) => (
              <Link
                key={key}
                href={key === "day" ? "/subnet" : `/subnet?trafik=${key}`}
                scroll={false}
                aria-current={key === view ? "page" : undefined}
                className={cn("rounded-md px-2.5 py-1 font-medium whitespace-nowrap", key === view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : undefined
      }
    >
      {!portId ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Grafik trafik belum diatur. Silakan hubungi admin TLINET.</p>
      ) : realtime ? (
        <RealtimeTraffic />
      ) : (
        <div className="flex flex-col gap-4 p-5">
          {traffic ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowDown className="size-3.5 text-brand-ink" /> Download saat ini
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatBitrate(traffic.outBps)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowUp className="size-3.5 text-emerald-600" /> Upload saat ini
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatBitrate(traffic.inBps)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Status koneksi</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusPill tone={traffic.up ? "good" : "bad"}>{traffic.up ? "Terhubung" : "Terputus"}</StatusPill>
                  {traffic.polledAt && <span className="text-xs text-muted-foreground">pukul {timeFormat.format(traffic.polledAt)} WITA</span>}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Data trafik sedang tidak bisa diambil. Coba muat ulang beberapa saat lagi.</p>
          )}
          {/* Di HP grafiknya kecil; ketuk untuk membukanya dalam ukuran penuh. */}
          <a href={`/subnet/traffic?range=${range}`} target="_blank" rel="noopener" title="Buka grafik ukuran penuh">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/subnet/traffic?range=${range}`}
              alt={`Grafik trafik ${trafficRanges[range].label} terakhir`}
              width={1000}
              height={300}
              className="h-auto w-full rounded-lg border bg-white"
            />
          </a>
          {traffic?.name && <p className="text-xs text-muted-foreground">Port {traffic.name} · sumber MRTG (LibreNMS)</p>}
        </div>
      )}
    </Panel>
  );
}

export default async function SubnetHomePage({ searchParams }: PageProps<"/subnet">) {
  const user = await requireSubnetUser();
  const trafik = (await searchParams).trafik;
  const view: TrafficView = trafik === "realtime" && realtimeConfigured() ? "realtime" : typeof trafik === "string" && trafik in trafficRanges ? (trafik as TrafficRange) : "day";
  const db = requireDb();
  const [settings, invoiceSettings, [customer], invoiceList, payments] = await Promise.all([
    getContent("settings"),
    getContent("invoice"),
    db.select().from(customers).where(eq(customers.id, user.customerId)).limit(1),
    db.select().from(invoices).where(eq(invoices.customerId, user.customerId)).orderBy(desc(invoices.issueDate), desc(invoices.number)),
    db.select().from(customerPayments).where(eq(customerPayments.customerId, user.customerId)).orderBy(desc(customerPayments.period)),
  ]);
  if (!customer) notFound();

  const today = todayWita();
  const unpaid = invoiceList.filter((invoice) => invoice.status !== "paid");
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + invoice.total, 0);
  const hasBank = Boolean(invoiceSettings.bankName && invoiceSettings.bankAccountNumber);
  const wilayah = [customer.district && `Kec. ${customer.district}`, customer.regency, customer.province].filter(Boolean).join(", ");
  const hasTower = Boolean(customer.towerLat || customer.towerLng);
  const statusPill = <StatusPill tone={customerTones[customer.status] ?? "muted"}>{customerStatusLabels[customer.status] ?? customer.status}</StatusPill>;

  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label={settings.brandName}>
            <Brand name={settings.brandName} highlight={settings.brandHighlight} logoUrl={settings.logoUrl} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <form action={subnetLogoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut />
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <SubnetPhoto photoUrl={customer.photos[0] ?? ""} name={customer.name} />
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <p className="max-w-full truncate text-xl font-semibold">{customer.name}</p>
              {customer.company && <p className="max-w-full truncate text-sm text-muted-foreground">{customer.company}</p>}
              {statusPill}
              {customer.activationDate && <p className="text-sm text-muted-foreground">Pelanggan sejak {formatDate(customer.activationDate)}</p>}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm lg:shrink-0">
            {[
              ["Site ID", customer.siteId],
              ["CID", customer.cid],
              ["Kapasitas", customer.capacity],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold break-words">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Panel icon={User} title="Informasi Pribadi">
            <InfoList
              items={[
                ["Nama", customer.name],
                ["PT", customer.company],
                ["No. Telepon", customer.phone],
                ["Site ID", customer.siteId],
                ["CID", customer.cid],
                ...(customer.accurateNo ? ([["No. Accurate", customer.accurateNo]] as [string, string][]) : []),
                ["Kecamatan", customer.district],
                ["Kabupaten", customer.regency],
                ["Provinsi", customer.province],
                ["AOS", fileLink(customer.aosUrl, "Lihat AOS")],
                ["PKS", fileLink(customer.pksUrl, "Lihat PKS")],
              ]}
            />
          </Panel>
          <Panel icon={Wifi} title="Informasi Layanan">
            <InfoList
              items={[
                ["Kapasitas", customer.capacity],
                ["Biaya Bulanan ke ISP", customer.monthlyFee ? formatRupiah(customer.monthlyFee) : ""],
                ["Vendor", customer.vendor],
                ["IP Address", customer.ipAddress],
                ["VLAN", customer.vlan],
                ["Tanggal Aktivasi", customer.activationDate ? formatDate(customer.activationDate) : ""],
                ["Status Layanan", statusPill],
                ...(hasTower ? [] : ([["Lokasi Tower", ""]] as [string, string][])),
              ]}
            />
            {hasTower && (
              <div className="flex flex-col gap-2 border-t px-5 pt-4 pb-5">
                <p className="text-sm font-medium">Lokasi Tower</p>
                <TowerMap lat={customer.towerLat} lng={customer.towerLng} label="Tower" />
              </div>
            )}
          </Panel>
        </div>

        {/* Data LibreNMS dimuat terpisah supaya bagian lain halaman tidak ikut menunggu. */}
        <Suspense
          key={view}
          fallback={
            <Panel icon={Activity} title="Trafik Internet">
              <p className="px-5 py-16 text-center text-sm text-muted-foreground">Memuat data trafik…</p>
            </Panel>
          }
        >
          <TrafficPanel portId={user.portId} view={view} />
        </Suspense>

        {user.pingTarget && (
          <Panel icon={Gauge} title="Ping Real-time">
            <SubnetPing target={user.pingTarget} />
          </Panel>
        )}

        <Panel icon={MapPin} title="Alamat Lengkap" action={<SubnetAddressButton value={{ address: customer.address, district: customer.district, regency: customer.regency, province: customer.province }} />}>
          <div className="flex flex-col gap-1.5 p-5 text-sm leading-relaxed">
            {customer.address ? <p className="whitespace-pre-line">{customer.address}</p> : <p className="text-muted-foreground">Alamat lengkap belum diisi.</p>}
            {wilayah && <p className="text-muted-foreground">{wilayah}</p>}
          </div>
        </Panel>

        <Panel
          icon={ScrollText}
          title="Invoice"
          action={
            unpaid.length > 0 ? (
              <p className="text-right text-sm">
                <span className="block text-xs text-muted-foreground">Belum dibayar</span>
                <span className="font-semibold text-destructive tabular-nums">{formatRupiah(unpaidTotal)}</span>
              </p>
            ) : undefined
          }
        >
          {unpaid.length > 0 && hasBank && (
            <div className="border-b bg-muted/30 px-5 py-4 text-sm">
              <p className="font-medium">Pembayaran dapat ditransfer ke:</p>
              <p className="mt-1">
                Rekening {invoiceSettings.bankName}: <span className="font-semibold tabular-nums">{invoiceSettings.bankAccountNumber}</span>
                {invoiceSettings.bankAccountHolder && <span className="text-muted-foreground"> a.n. {invoiceSettings.bankAccountHolder}</span>}
              </p>
            </div>
          )}
          {invoiceList.length ? (
            <ul className="divide-y">
              {invoiceList.map((invoice) => {
                const paid = invoice.status === "paid";
                const overdue = !paid && invoice.dueDate < today;
                const items = invoice.items.map((item) => item.description.trim()).filter(Boolean).join(", ");
                return (
                  <li key={invoice.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{invoice.number}</p>
                        <StatusPill tone={paid ? "good" : overdue ? "bad" : "warn"}>{paid ? "Paid" : overdue ? "Lewat jatuh tempo" : "Unpaid"}</StatusPill>
                      </div>
                      {items && <p className="mt-1 truncate text-sm text-muted-foreground">{items}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Terbit {formatDate(invoice.issueDate)} · Jatuh tempo {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="font-semibold whitespace-nowrap tabular-nums">{formatRupiah(invoice.total)}</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href={invoicePublicPath(invoice.id)}>
                          <FileText />
                          Lihat / Unduh
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada invoice.</p>
          )}
        </Panel>

        <Panel icon={ReceiptText} title="History Pembayaran Subnet">
          {payments.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 pl-5">No</TableHead>
                  <TableHead>Bulan</TableHead>
                  <TableHead>Tanggal Bayar</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5">Bukti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={payment.id}>
                    <TableCell className="pl-5 text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{formatMonth(payment.period)}</TableCell>
                    <TableCell className="whitespace-nowrap">{payment.paidDate ? formatDate(payment.paidDate) : empty}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatRupiah(payment.amount)}</TableCell>
                    <TableCell>{payment.method || empty}</TableCell>
                    <TableCell>
                      <StatusPill tone={payment.status === "paid" ? "good" : "warn"}>{paymentStatusLabels[payment.status] ?? payment.status}</StatusPill>
                    </TableCell>
                    <TableCell className="pr-5">{fileLink(payment.proofUrl, "Lihat") || empty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada pembayaran yang dicatat.</p>
          )}
        </Panel>
      </main>
    </div>
  );
}

import { and, desc, eq } from "drizzle-orm";
import { ArrowUpCircle, ChartLine, ChevronRight, FileText, Gauge, Headset, History, MapPin, Package, Route, Siren, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { customerTones } from "@/components/admin/detail-panels";
import { MetroSummary } from "@/components/site/metro-timeline";
import { ConnectionSummaryCard } from "@/components/site/subnet-connection";
import { CardLink, greeting, ListRow, SectionCard, StatusDot } from "@/components/site/subnet-ui";
import { customerStatusLabels, paymentStatusLabels } from "@/lib/cms/entities";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customerPayments, customers, invoices, metroOrders } from "@/lib/db/schema";
import { formatDate, formatMonth, formatRupiah, parseCapacityBps, whatsappUrl } from "@/lib/format";
import { invoicePublicPath } from "@/lib/invoices";
import { getPortTraffic, realtimeConfigured } from "@/lib/librenms";
import { isMetroKind, metroProgress } from "@/lib/metro";
import { requireSubnetUser } from "@/lib/subnet";
import { cn } from "@/lib/utils";
import { daysUntil, todayWita } from "./dates";

/** Tautan internal atau, untuk WhatsApp, tab baru (di aplikasi Android dibuka di WhatsApp). */
function ActionLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return /^https?:/.test(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Aksi cepat: ikon garis dan label, tanpa kotak berwarna. */
function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <ActionLink href={href} className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-center transition-colors hover:bg-muted/70 active:bg-muted">
      <Icon className="size-[1.4rem] text-brand-ink" strokeWidth={1.8} />
      <span className="text-[11px] leading-tight font-medium">{label}</span>
    </ActionLink>
  );
}

const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

type Activity = { key: string; date: string; title: string; detail: string; icon: LucideIcon; done: boolean; href?: string };

export default async function SubnetHomePage({ searchParams }: PageProps<"/subnet">) {
  // Tautan lama ke grafik trafik di halaman ini.
  const { trafik } = await searchParams;
  if (typeof trafik === "string") redirect(trafik === "day" ? "/subnet/trafik/grafik" : `/subnet/trafik/grafik?rentang=${encodeURIComponent(trafik)}`);

  const user = await requireSubnetUser();
  const db = requireDb();
  const [settings, [customer], invoiceList, payments, traffic, metroRows] = await Promise.all([
    getContent("settings"),
    db.select().from(customers).where(eq(customers.id, user.customerId)).limit(1),
    db
      .select({ id: invoices.id, number: invoices.number, total: invoices.total, status: invoices.status, issueDate: invoices.issueDate, dueDate: invoices.dueDate })
      .from(invoices)
      .where(eq(invoices.customerId, user.customerId))
      .orderBy(desc(invoices.issueDate), desc(invoices.number)),
    db.select().from(customerPayments).where(eq(customerPayments.customerId, user.customerId)).orderBy(desc(customerPayments.period)).limit(3),
    user.portId ? getPortTraffic(user.portId) : null,
    db
      .select()
      .from(metroOrders)
      .where(and(eq(metroOrders.customerId, user.customerId), eq(metroOrders.status, "active")))
      .orderBy(desc(metroOrders.createdAt)),
  ]);
  if (!customer) notFound();

  const today = todayWita();
  const unpaid = invoiceList.filter((invoice) => invoice.status !== "paid");
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + invoice.total, 0);
  const nextDue = unpaid.map((invoice) => invoice.dueDate).sort()[0];
  const dueIn = nextDue ? daysUntil(nextDue, today) : 0;
  const latestInvoice = invoiceList[0];
  const metro = metroRows.find((row) => isMetroKind(row.kind));
  const metroOrder = metro && isMetroKind(metro.kind) ? { ...metro, kind: metro.kind, status: "active" as const } : null;
  const metroNext = metroOrder ? metroProgress(metroOrder.kind, metroOrder.steps).next : null;
  const statusTone = customerTones[customer.status] ?? "muted";

  const chat = (number: string, message: string) => (number ? whatsappUrl(number, message) : "/subnet/layanan#bantuan");
  // Gangguan jaringan langsung ke IT Support Jaringan; Customer Service bila nomornya belum diisi.
  const report = chat(
    settings.itSupportWhatsapp || settings.whatsappNumber,
    [
      `Halo IT Support Jaringan ${settings.brandName}, saya ingin melaporkan gangguan.`,
      `Nama: ${customer.name}`,
      customer.siteId && `Site ID: ${customer.siteId}`,
      customer.cid && `CID: ${customer.cid}`,
      customer.ipAddress && `IP: ${customer.ipAddress}`,
      traffic && `Status di portal: ${traffic.up ? "Terhubung" : "Terputus"}`,
      "Keluhan: ",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  // Kejadian terakhir: invoice yang terbit dan pembayaran yang dicatat, terbaru di atas.
  const activities: Activity[] = [
    ...invoiceList.slice(0, 3).map((invoice) => ({
      key: `i-${invoice.id}`,
      date: invoice.issueDate,
      title: `Invoice ${invoice.number}`,
      detail: `${formatRupiah(invoice.total)} · ${invoice.status === "paid" ? "Lunas" : `jatuh tempo ${formatDate(invoice.dueDate)}`}`,
      icon: FileText,
      done: invoice.status === "paid",
      href: invoicePublicPath(invoice.id),
    })),
    ...payments.map((payment) => ({
      key: `p-${payment.id}`,
      date: payment.paidDate || `${payment.period}-01`,
      title: `Pembayaran ${formatMonth(payment.period)}`,
      detail: `${formatRupiah(payment.amount)} · ${paymentStatusLabels[payment.status] ?? payment.status}`,
      icon: Wallet,
      done: payment.status === "paid",
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <>
      {/* Ucapan sambutan di atas pita biru (PortalBand); kartu akun menumpang di bawahnya. */}
      <div className="flex items-start justify-between gap-3 text-white">
        <div className="min-w-0">
          <p className="text-sm text-white/75">{greeting()},</p>
          <p className="mt-0.5 truncate text-xl font-semibold tracking-tight md:text-2xl">{customer.name}</p>
          {customer.company && <p className="truncate text-sm text-white/75">{customer.company}</p>}
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
          <span className={cn("size-1.5 rounded-full", statusTone === "good" ? "bg-emerald-400" : statusTone === "bad" ? "bg-red-400" : "bg-amber-300")} />
          {customerStatusLabels[customer.status] ?? customer.status}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        {/* Di HP semua kartu satu kolom dengan urutan sendiri (order-*); di layar lebar dua kolom. */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <dl className="mx-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-3 border-b py-3.5 sm:mx-5">
              {[
                ["Paket", customer.capacity],
                ["Site ID", customer.siteId],
                ["CID", customer.cid],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 line-clamp-2 text-sm font-semibold break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-4 gap-1 p-2">
              <QuickAction href="/subnet/tagihan" icon={Wallet} label="Bayar tagihan" />
              <QuickAction href={latestInvoice ? invoicePublicPath(latestInvoice.id) : "/subnet/tagihan"} icon={FileText} label="Invoice terbaru" />
              <QuickAction href="/subnet/trafik" icon={Gauge} label="Cek kecepatan" />
              <QuickAction href={report} icon={Siren} label="Lapor gangguan" />
            </div>
          </section>

          {metroOrder && (
            <Link href="/subnet/progres" className="group order-1 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/20 sm:p-5 lg:order-none">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[0.9375rem] font-semibold">Progres Metro</p>
                <span className="flex items-center gap-0.5 text-sm font-medium text-brand-ink">
                  Lihat
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <MetroSummary order={metroOrder} />
              {metroNext && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Sedang diproses: <span className="font-semibold text-foreground">{metroNext.label}</span>
                </p>
              )}
            </Link>
          )}

          <SectionCard title="Layanan lainnya" className="order-5 lg:order-none">
            <div className="divide-y">
              <ListRow href="/subnet/tagihan#riwayat" icon={History} title="Riwayat pembayaran" />
              <ListRow href="/subnet/trafik/grafik" icon={ChartLine} title="Grafik MRTG" subtitle="Trafik 1 hari, 1 minggu, 1 bulan" />
              {!metroOrder && <ListRow href="/subnet/progres" icon={ArrowUpCircle} title="Ajukan upgrade kapasitas" subtitle="Pantau prosesnya di Progres Metro" />}
              {metroOrder && <ListRow href="/subnet/progres" icon={Route} title="Progres Metro" />}
              <ListRow href="/subnet/layanan" icon={Package} title="Detail layanan" subtitle="Data teknis dan dokumen kontrak" />
              <ListRow href="/subnet/profil#alamat" icon={MapPin} title="Alamat lokasi" />
              <ListRow href={chat(settings.whatsappNumber, `Halo ${settings.brandName}, saya ${customer.name}${customer.siteId ? ` (Site ID ${customer.siteId})` : ""}. `)} icon={Headset} title="Customer Service" subtitle="Chat WhatsApp" />
            </div>
          </SectionCard>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="order-2 lg:order-none">
            {!user.portId && user.qos ? (
              // Pelanggan dengan antrean QoS: grafik MRTG harian sebagai ringkasan, tanpa pembacaan langsung.
              <Link href="/subnet/trafik" className="group block overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/20">
                <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3 sm:px-5">
                  <p className="text-[0.9375rem] font-semibold">Trafik internet</p>
                  <span className="flex items-center gap-0.5 text-sm font-medium text-brand-ink">
                    Detail
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/subnet/traffic?range=day" alt="Grafik trafik 1 hari terakhir" width={1000} height={300} className="h-auto w-full border-t bg-white" />
              </Link>
            ) : (
              <ConnectionSummaryCard
                initial={traffic ? { up: traffic.up, inBps: traffic.inBps, outBps: traffic.outBps, polledAt: traffic.polledAt?.getTime() ?? null } : null}
                realtime={Boolean(user.portId) && realtimeConfigured()}
                capacityBps={parseCapacityBps(customer.capacity)}
              />
            )}
          </div>

          <SectionCard title="Tagihan" action={<CardLink href="/subnet/tagihan">Semua</CardLink>} className="order-3 lg:order-none">
            {unpaid.length ? (
              <div className="flex items-end justify-between gap-3 px-4 pt-1 pb-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatRupiah(unpaidTotal)}</p>
                  <StatusDot tone={dueIn < 0 ? "bad" : "warn"} className="mt-1">
                    {dueIn < 0 ? `Terlambat ${-dueIn} hari` : dueIn === 0 ? "Jatuh tempo hari ini" : `Jatuh tempo ${formatDate(nextDue)}`}
                  </StatusDot>
                </div>
                <Link href="/subnet/tagihan" className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90">
                  Bayar
                </Link>
              </div>
            ) : (
              <div className="px-4 pt-1 pb-4 sm:px-5">
                <p className="text-sm font-medium">Tidak ada tagihan yang perlu dibayar.</p>
                <StatusDot tone="good" className="mt-1">
                  Semua lunas
                </StatusDot>
              </div>
            )}
          </SectionCard>

          {activities.length > 0 && (
            <SectionCard title="Aktivitas terakhir" className="order-4 lg:order-none">
              <ul className="divide-y">
                {activities.map(({ key, date, title, detail, icon: Icon, done, href }) => {
                  const body = (
                    <>
                      <Icon className={cn("size-5 shrink-0", done ? "text-emerald-600" : "text-muted-foreground")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{shortDate.format(new Date(date))}</span>
                    </>
                  );
                  return (
                    <li key={key}>
                      {href ? (
                        <Link href={href} className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/60 sm:px-5">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3.5 px-4 py-3 sm:px-5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>
    </>
  );
}

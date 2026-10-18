import { and, desc, eq } from "drizzle-orm";
import { ArrowUpCircle, ChartLine, ChevronRight, CircleCheck, FileText, Gauge, Headset, History, MapPin, Package, ReceiptText, Route, Siren, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { customerTones, initials, StatusPill } from "@/components/admin/detail-panels";
import { BrandMark } from "@/components/site/brand";
import { MetroSummary } from "@/components/site/metro-timeline";
import { ConnectionSummaryCard } from "@/components/site/subnet-connection";
import { greeting, SectionCard } from "@/components/site/subnet-ui";
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

/** Aksi cepat di kartu sambutan. */
function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <ActionLink href={href} className="group flex flex-col items-center gap-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm transition-colors group-hover:bg-white/15 group-active:scale-95">
        <Icon className="size-5" />
      </span>
      <span className="text-[11px] leading-tight font-medium text-white/85">{label}</span>
    </ActionLink>
  );
}

function MenuTile({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <ActionLink href={href} className="group flex flex-col items-center gap-2 rounded-2xl py-2 text-center hover:bg-muted/60">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-transform group-active:scale-95">
        <Icon className="size-5" />
      </span>
      <span className="text-xs leading-tight font-medium">{label}</span>
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
  const photoUrl = customer.photos[0] ?? "";
  const metro = metroRows.find((row) => isMetroKind(row.kind));
  const metroOrder = metro && isMetroKind(metro.kind) ? { ...metro, kind: metro.kind, status: "active" as const } : null;
  const metroNext = metroOrder ? metroProgress(metroOrder.kind, metroOrder.steps).next : null;

  const chat = (message: string) => (settings.whatsappNumber ? whatsappUrl(settings.whatsappNumber, message) : "/subnet/layanan#bantuan");
  const report = chat(
    [
      `Halo NOC ${settings.brandName}, saya ingin melaporkan gangguan.`,
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
    <div className="flex flex-col gap-4 sm:gap-5 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
      {/* Di HP semua kartu satu kolom dengan urutan sendiri (order-*); di layar lebar dua kolom. */}
      <div className="contents lg:flex lg:flex-col lg:gap-5">
        <section className="surface-ink relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-ink/15 sm:p-6">
          <div className="absolute -top-24 -right-20 -z-10 size-60 rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
          <BrandMark className="absolute -top-6 -right-6 -z-10 size-36 opacity-[0.07]" />

          <div className="flex items-center gap-4">
            <Link href="/subnet/profil" aria-label="Profil saya" className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-lg font-semibold ring-1 ring-white/20">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(customer.name)
              )}
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-white/60">{greeting()},</p>
              <p className="truncate text-xl font-bold tracking-tight">{customer.name}</p>
              {customer.company && <p className="truncate text-xs text-white/60">{customer.company}</p>}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
            <div className="min-w-0">
              <p className="text-[11px] text-white/55">Paket internet</p>
              <p className="truncate text-lg font-bold">{customer.capacity || "—"}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[11px] text-white/55">Site ID</p>
              <p className="truncate text-sm font-semibold">{customer.siteId || "—"}</p>
            </div>
            <StatusPill tone={customerTones[customer.status] ?? "muted"}>{customerStatusLabels[customer.status] ?? customer.status}</StatusPill>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            <QuickAction href="/subnet/tagihan" icon={Wallet} label="Bayar Tagihan" />
            <QuickAction href={latestInvoice ? invoicePublicPath(latestInvoice.id) : "/subnet/tagihan"} icon={FileText} label="Invoice Terbaru" />
            <QuickAction href="/subnet/trafik" icon={Gauge} label="Cek Kecepatan" />
            <QuickAction href={report} icon={Siren} label="Lapor Gangguan" />
          </div>
        </section>

        <SectionCard title="Layanan Lainnya" className="order-5 pb-3 lg:order-none">
          <div className="grid grid-cols-4 gap-1 px-3">
            <MenuTile href="/subnet/tagihan#riwayat" icon={History} label="Riwayat Bayar" />
            <MenuTile href="/subnet/trafik/grafik" icon={ChartLine} label="Grafik MRTG" />
            <MenuTile href="/subnet/trafik#ping" icon={Gauge} label="Cek Ping" />
            <MenuTile href="/subnet/layanan" icon={Package} label="Detail Layanan" />
            <MenuTile href="/subnet/layanan#dokumen" icon={ReceiptText} label="Dokumen" />
            <MenuTile href="/subnet/profil#alamat" icon={MapPin} label="Alamat" />
            <MenuTile href={chat(`Halo ${settings.brandName}, saya ${customer.name}${customer.siteId ? ` (Site ID ${customer.siteId})` : ""}. `)} icon={Headset} label="Hubungi NOC" />
            <MenuTile href="/subnet/progres" icon={Route} label="Progres Metro" />
          </div>
        </SectionCard>

        {/* Progres yang berjalan tampil di atas (HP: tepat setelah kartu sambutan); bila tidak ada, ajakan upgrade di bawah. */}
        {metroOrder ? (
          <Link href="/subnet/progres" className="group order-1 rounded-3xl border bg-card p-5 shadow-sm shadow-ink/5 transition-colors hover:border-brand/30 lg:order-none">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-8 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Route className="size-4" />
              </span>
              Progres Metro
            </p>
            <MetroSummary order={metroOrder} />
            {metroNext && (
              <p className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-muted/70 px-3 py-2.5 text-xs">
                <span>
                  Sedang diproses: <span className="font-semibold">{metroNext.label}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </p>
            )}
          </Link>
        ) : (
          <Link href="/subnet/progres" className="group order-6 flex items-center gap-4 rounded-3xl border bg-card p-5 shadow-sm shadow-ink/5 transition-colors hover:border-brand/30 lg:order-none">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <ArrowUpCircle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Butuh kecepatan lebih?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Ajukan upgrade kapasitas dan pantau prosesnya di Progres Metro.</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-5">
        <div className="order-2 lg:order-none">
          <ConnectionSummaryCard
            initial={traffic ? { up: traffic.up, inBps: traffic.inBps, outBps: traffic.outBps, polledAt: traffic.polledAt?.getTime() ?? null } : null}
            realtime={Boolean(user.portId) && realtimeConfigured()}
            capacityBps={parseCapacityBps(customer.capacity)}
          />
        </div>

        <Link href="/subnet/tagihan" className="group order-3 rounded-3xl border bg-card p-5 shadow-sm shadow-ink/5 transition-colors hover:border-brand/30 lg:order-none">
          {unpaid.length ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Tagihan belum dibayar</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{formatRupiah(unpaidTotal)}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                  <ReceiptText className="size-5" />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", dueIn < 0 ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground")}>
                  <span className={cn("size-1.5 rounded-full", dueIn < 0 ? "bg-red-500" : "bg-amber-500")} />
                  {dueIn < 0 ? `Terlambat ${-dueIn} hari` : dueIn === 0 ? "Jatuh tempo hari ini" : `Jatuh tempo ${formatDate(nextDue)}`}
                </span>
                <span className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white">Bayar</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CircleCheck className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Semua tagihan lunas</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Terima kasih telah membayar tepat waktu.</p>
              </div>
            </div>
          )}
        </Link>

        {activities.length > 0 && (
          <SectionCard title="Aktivitas Terakhir" className="order-4 lg:order-none" action={<Link href="/subnet/tagihan" className="text-xs font-semibold text-brand-ink">Lihat semua</Link>}>
            <ul className="px-2 pb-2">
              {activities.map(({ key, date, title, detail, icon: Icon, done, href }) => {
                const body = (
                  <>
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", done ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-secondary-foreground")}>
                      <Icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{shortDate.format(new Date(date))}</span>
                  </>
                );
                return (
                  <li key={key}>
                    {href ? (
                      <Link href={href} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted/60">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

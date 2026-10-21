import { count, desc, eq, inArray } from "drizzle-orm";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChartColumn,
  CircleAlert,
  CircleCheck,
  Clock,
  Cloud,
  Database,
  Eye,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Newspaper,
  Package,
  PieChart,
  ReceiptText,
  Scale,
  ServerCog,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero, StatCard, StatGrid } from "@/components/admin/page-hero";
import { Button } from "@/components/ui/button";
import { accurateMode } from "@/lib/accurate";
import { requireAdmin } from "@/lib/auth";
import { invoiceStatusLabels } from "@/lib/cms/entities";
import { requireDb } from "@/lib/db";
import { articles, coverageAreas, customerPayments, customerPurchases, customers, employees, invoices, leads, packages, salaryPayments } from "@/lib/db/schema";
import { formatDate, formatRupiah } from "@/lib/format";
import { can } from "@/lib/permissions";
import { pingR2, storageMode } from "@/lib/storage";
import { cn } from "@/lib/utils";

const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" });
/** Di HP (dan aplikasi TLINET Admin) label bulan grafik tanpa tahun agar tidak saling bertumpuk. */
const shortMonthLabel = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" });
const todayFormat = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" });

/** "2026-10" untuk enam bulan terakhir (termasuk bulan ini, WITA), dari yang terlama. */
function lastMonths(total: number) {
  const now = new Date(Date.now() + 8 * 3600_000);
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (total - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

/** "2 jam yang lalu", "3 hari yang lalu". */
function timeAgo(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.round(hours / 24);
  return days < 31 ? `${days} hari yang lalu` : formatDate(date.toISOString().slice(0, 10));
}

/** "+12%" dibanding bulan sebelumnya, atau `null` bila bulan lalu kosong. */
function change(current: number, previous: number) {
  if (!previous) return null;
  const percent = Math.round(((current - previous) / previous) * 100);
  return { text: `${percent > 0 ? "+" : ""}${percent}%`, up: percent >= 0 };
}

function Panel({ title, icon: Icon, description, action, children, className }: { title: string; icon: LucideIcon; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)] dark:shadow-[0_0_24px_-12px_rgba(59,130,246,0.4)]", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Icon className="size-5 text-brand-ink" />
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Batang berpasangan per bulan: total tagihan (biru) dan yang sudah dibayar (hijau). */
type ChartSeries = { label: string; bar: string; dot: string };

const seriesStyle = {
  blue: { bar: "from-blue-600 to-blue-400 shadow-[0_0_14px_-4px_rgba(59,130,246,0.7)]", dot: "bg-blue-500" },
  green: { bar: "from-emerald-600 to-emerald-400 shadow-[0_0_14px_-4px_rgba(16,185,129,0.7)]", dot: "bg-emerald-500" },
  red: { bar: "from-rose-600 to-rose-400 shadow-[0_0_14px_-4px_rgba(244,63,94,0.6)]", dot: "bg-rose-500" },
};
const chartSeries = (label: string, tone: keyof typeof seriesStyle): ChartSeries => ({ label, ...seriesStyle[tone] });

/** Batang per bulan untuk satu atau dua deret nilai rupiah (mis. tagihan vs pembayaran, uang masuk vs keluar). */
function BarChart({ data, series }: { data: { month: string; values: number[] }[]; series: ChartSeries[] }) {
  const max = Math.max(1, ...data.flatMap((item) => item.values));
  // Skala sumbu dalam juta, dibulatkan ke 1/2/5 × 10^n supaya garisnya rapi.
  const power = 10 ** Math.floor(Math.log10(max));
  const top = ([1, 2, 5, 10].find((step) => step * power >= max) ?? 10) * power;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => top * fraction);
  const label = (value: number) => (value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : value.toLocaleString("id-ID"));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", item.dot)} /> {item.label}
          </span>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="flex h-48 flex-col-reverse justify-between pb-6 text-right text-[10px] text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 leading-none">
              {label(tick)}
            </span>
          ))}
        </div>
        <div className="relative grid h-48 flex-1 grid-cols-6 gap-2">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} className="border-t border-dashed border-border" />
            ))}
          </div>
          {data.map((item) => (
            <div key={item.month} className="relative flex flex-col items-center">
              <div className="flex h-[calc(100%-1.5rem)] w-full items-end justify-center gap-1.5">
                {item.values.map((value, index) => (
                  <div
                    key={series[index]?.label ?? index}
                    className={cn("w-1/3 max-w-7 rounded-t-md bg-gradient-to-t", series[index]?.bar)}
                    style={{ height: `${(value / top) * 100}%` }}
                    title={`${series[index]?.label}: ${formatRupiah(value)}`}
                  />
                ))}
              </div>
              <span className="mt-2 text-[11px] whitespace-nowrap text-muted-foreground">
                <span className="sm:hidden">{shortMonthLabel.format(new Date(`${item.month}-01T00:00:00Z`))}</span>
                <span className="hidden sm:inline">{monthLabel.format(new Date(`${item.month}-01T00:00:00Z`))}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Baris rincian nominal di panel Pembelian dan Gaji. */
function MoneyRows({ rows }: { rows: { label: string; value: number; hint?: string; tone?: "good" | "warn" }[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label} className="flex items-start justify-between gap-3">
          <span className="min-w-0 text-sm">
            <span className="flex items-center gap-2">
              {row.tone && <span className={cn("size-2 shrink-0 rounded-full", row.tone === "good" ? "bg-emerald-500" : "bg-amber-500")} />}
              {row.label}
            </span>
            {row.hint && <span className="block text-xs text-muted-foreground">{row.hint}</span>}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatRupiah(row.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Donat jumlah invoice lunas dan belum lunas. */
function PaymentDonut({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid;
  const share = total ? paid / total : 0;
  const circumference = 2 * Math.PI * 42;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative size-40">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="12" className="stroke-rose-500" />
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="12" className="stroke-emerald-500" strokeDasharray={`${share * circumference} ${circumference}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">Invoice</span>
        </div>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="w-16">Paid</span>
          <span className="font-semibold tabular-nums">
            {paid} ({total ? Math.round(share * 100) : 0}%)
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rose-500" />
          <span className="w-16">Unpaid</span>
          <span className="font-semibold tabular-nums">
            {unpaid} ({total ? 100 - Math.round(share * 100) : 0}%)
          </span>
        </li>
      </ul>
    </div>
  );
}

function SystemRow({ ok, icon: Icon, title, detail }: { ok: boolean; icon: LucideIcon; title: string; detail: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-md shadow-blue-500/30">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
      {ok ? <CircleCheck className="size-5 shrink-0 text-emerald-500" /> : <CircleAlert className="size-5 shrink-0 text-amber-500" />}
    </li>
  );
}

const activityStyle = {
  paid: { icon: ReceiptText, className: "bg-emerald-500" },
  article: { icon: Newspaper, className: "bg-violet-500" },
  lead: { icon: Inbox, className: "bg-blue-500" },
  package: { icon: Package, className: "bg-orange-500" },
} as const;

export default async function DashboardPage() {
  const admin = await requireAdmin("dashboard");
  const billing = can(admin, "billing");
  // Pembelian dan gaji termasuk data Keuangan; uang masuk (pembayaran pelanggan) termasuk Invoice & History Pembayaran.
  const finance = can(admin, "finance");
  const db = requireDb();
  const [[newLeads], [packageCount], [areaCount], [articleCount], invoiceRows, recentLeads, recentArticles, recentPackages, r2Online] = await Promise.all([
    db.select({ value: count() }).from(leads).where(eq(leads.status, "new")),
    db.select({ value: count() }).from(packages).where(eq(packages.active, true)),
    db.select({ value: count() }).from(coverageAreas).where(eq(coverageAreas.active, true)),
    db.select({ value: count() }).from(articles).where(eq(articles.status, "published")),
    billing
      ? db
          .select({ id: invoices.id, number: invoices.number, status: invoices.status, issueDate: invoices.issueDate, dueDate: invoices.dueDate, total: invoices.total, customerId: invoices.customerId, updatedAt: invoices.updatedAt })
          .from(invoices)
          .orderBy(desc(invoices.issueDate), desc(invoices.number))
      : Promise.resolve([]),
    db.select({ name: leads.name, createdAt: leads.createdAt }).from(leads).orderBy(desc(leads.createdAt)).limit(3),
    db.select({ title: articles.title, updatedAt: articles.updatedAt }).from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.updatedAt)).limit(2),
    db.select({ name: packages.name, updatedAt: packages.updatedAt }).from(packages).orderBy(desc(packages.updatedAt)).limit(2),
    storageMode === "r2" ? pingR2() : Promise.resolve(false),
  ]);

  type MoneyRow = { amount: number; status: string; paidDate: string; period: string };
  const [paymentRows, purchaseRows, salaryRows, [activeEmployees]]: [MoneyRow[], MoneyRow[], MoneyRow[], { value: number }[]] = await Promise.all([
    billing && finance
      ? db.select({ amount: customerPayments.amount, status: customerPayments.status, paidDate: customerPayments.paidDate, period: customerPayments.period }).from(customerPayments)
      : Promise.resolve([]),
    finance
      ? db.select({ amount: customerPurchases.amount, status: customerPurchases.status, paidDate: customerPurchases.paidDate, period: customerPurchases.period }).from(customerPurchases)
      : Promise.resolve([]),
    finance
      ? db.select({ amount: salaryPayments.amount, status: salaryPayments.status, paidDate: salaryPayments.paidDate, period: salaryPayments.period }).from(salaryPayments)
      : Promise.resolve([]),
    finance ? db.select({ value: count() }).from(employees).where(eq(employees.status, "active")) : Promise.resolve([{ value: 0 }]),
  ]);

  const recentInvoices = invoiceRows.slice(0, 5);
  const customerIds = [...new Set(recentInvoices.map((invoice) => invoice.customerId).filter(Boolean))];
  const names = customerIds.length ? await db.select({ id: customers.id, company: customers.company, name: customers.name }).from(customers).where(inArray(customers.id, customerIds)) : [];
  const nameOf = (id: string) => {
    const customer = names.find((item) => item.id === id);
    return customer ? customer.company || customer.name : "—";
  };

  const months = lastMonths(6);
  const series = months.map((month) => {
    const list = invoiceRows.filter((invoice) => invoice.issueDate.startsWith(month));
    return { month, total: list.reduce((sum, item) => sum + item.total, 0), paid: list.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.total, 0), count: list.length };
  });
  const [previous, current] = series.slice(-2);

  // Arus kas dihitung di bulan uangnya berpindah: tanggal bayar, atau bulan tagihannya bila tanggal bayar kosong.
  const cashMonth = (row: MoneyRow) => (row.paidDate || row.period).slice(0, 7);
  const total = (list: MoneyRow[]) => list.reduce((sum, row) => sum + row.amount, 0);
  const paidIn = (list: MoneyRow[], month: string) => total(list.filter((row) => row.status === "paid" && cashMonth(row) === month));
  const cash = months.map((month) => {
    const purchases = paidIn(purchaseRows, month);
    const salaries = paidIn(salaryRows, month);
    return { month, in: paidIn(paymentRows, month), out: purchases + salaries, purchases, salaries };
  });
  const [cashBefore, cashNow] = cash.slice(-2);
  const net = cashNow.in - cashNow.out;
  const unpaidOut = [...purchaseRows, ...salaryRows].filter((row) => row.status !== "paid");
  const thisMonth = months.at(-1)!;
  const ofMonth = (list: MoneyRow[]) => list.filter((row) => row.period.slice(0, 7) === thisMonth);
  const purchasesNow = ofMonth(purchaseRows);
  const salariesNow = ofMonth(salaryRows);
  const paidOf = (list: MoneyRow[]) => total(list.filter((row) => row.status === "paid"));
  const unpaidOf = (list: MoneyRow[]) => list.filter((row) => row.status !== "paid");
  const paidRows = invoiceRows.filter((invoice) => invoice.status === "paid");
  const unpaidRows = invoiceRows.filter((invoice) => invoice.status !== "paid");
  const sum = (list: typeof invoiceRows) => list.reduce((total, item) => total + item.total, 0);
  const totalChange = change(current.total, previous.total);
  const paidChange = change(current.paid, previous.paid);
  const unpaidChange = change(current.total - current.paid, previous.total - previous.paid);
  const trend = (value: ReturnType<typeof change>) =>
    value ? <span className={cn("font-semibold", value.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>{` · ${value.text} ${value.up ? "↑" : "↓"}`}</span> : null;

  const activities = [
    ...paidRows.slice(0, 4).map((invoice) => ({ kind: "paid" as const, text: `Invoice ${invoice.number} dibayar`, at: invoice.updatedAt })),
    ...recentArticles.map((article) => ({ kind: "article" as const, text: `Artikel diterbitkan: ${article.title}`, at: article.updatedAt })),
    ...recentLeads.map((lead) => ({ kind: "lead" as const, text: `Prospek baru masuk: ${lead.name}`, at: lead.createdAt })),
    ...recentPackages.map((item) => ({ kind: "package" as const, text: `Paket internet diperbarui: ${item.name}`, at: item.updatedAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  const storage =
    storageMode === "r2"
      ? r2Online
        ? { ok: true, detail: "Cloudflare R2 terhubung." }
        : { ok: false, detail: "Cloudflare R2 tidak dapat dijangkau. Periksa kredensial R2." }
      : storageMode === "incomplete"
        ? { ok: false, detail: "Variabel R2 belum lengkap; unggahan ditolak." }
        : { ok: true, detail: "Gambar unggahan disimpan di database Neon." };
  const accurateOk = accurateMode === "ready";
  const allOk = storage.ok && accurateOk;

  return (
    <>
      <PageHero
        variant="night"
        title="Ringkasan"
        accent=""
        icon={LayoutDashboard}
        description={
          <>
            <p className="font-medium text-white">Selamat datang, {admin.name}.</p>
            <p>Pantau aktivitas, transaksi, pelanggan, dan performa jaringan TLINET dalam satu dashboard.</p>
          </>
        }
        meta={
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white ring-1 ring-white/20 backdrop-blur">
            <CalendarDays className="size-5 text-sky-300" />
            <span className="leading-tight capitalize">{todayFormat.format(new Date())}</span>
          </div>
        }
      />

      {billing ? (
        <StatGrid>
          <StatCard tone="blue" icon={FileText} label="Total Tagihan" value={formatRupiah(sum(invoiceRows))} hint={<>{invoiceRows.length} transaksi{trend(totalChange)}</>} spark={series.map((item) => item.total)} href="/admin/data/invoices" />
          <StatCard tone="green" icon={Wallet} label="Sudah Dibayar" value={formatRupiah(sum(paidRows))} hint={<>{paidRows.length} transaksi{trend(paidChange)}</>} spark={series.map((item) => item.paid)} href="/admin/data/invoices" />
          <StatCard tone="orange" icon={Clock} label="Belum Dibayar" value={formatRupiah(sum(unpaidRows))} hint={<>{unpaidRows.length} transaksi{trend(unpaidChange)}</>} spark={series.map((item) => item.total - item.paid)} href="/admin/data/invoices" />
          <StatCard tone="purple" icon={ReceiptText} label="Jumlah Invoice" value={invoiceRows.length} hint={`${current.count} invoice bulan ini`} spark={series.map((item) => item.count)} href="/admin/data/invoices" />
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard tone="blue" icon={Inbox} label="Prospek baru" value={newLeads.value} hint="Menunggu dihubungi" href="/admin/data/leads" />
          <StatCard tone="green" icon={Package} label="Paket aktif" value={packageCount.value} hint="Tampil di beranda" href="/admin/data/packages" />
          <StatCard tone="orange" icon={MapPin} label="Titik jangkauan" value={areaCount.value} hint="Tampil di peta" href="/admin/data/coverage-areas" />
          <StatCard tone="purple" icon={Newspaper} label="Artikel terbit" value={articleCount.value} hint="Tampil di halaman berita" href="/admin/data/articles" />
        </StatGrid>
      )}

      {finance && (
        <section className="flex flex-col gap-4" aria-labelledby="arus-kas">
          <h2 id="arus-kas" className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold tracking-tight">
            Arus Kas
            <span className="text-sm font-normal text-muted-foreground">{monthLabel.format(new Date(`${thisMonth}-01T00:00:00Z`))} · uang yang sudah dibayar</span>
          </h2>
          <StatGrid>
            {billing && (
              <StatCard
                tone="green"
                icon={ArrowDownLeft}
                label="Uang Masuk"
                value={formatRupiah(cashNow.in)}
                hint={<>Pembayaran pelanggan{trend(change(cashNow.in, cashBefore.in))}</>}
                spark={cash.map((item) => item.in)}
                href="/admin/data/customer-payments"
              />
            )}
            <StatCard
              tone="red"
              icon={ArrowUpRight}
              label="Uang Keluar"
              value={formatRupiah(cashNow.out)}
              hint={`Pemasok ${formatRupiah(cashNow.purchases)} · Gaji ${formatRupiah(cashNow.salaries)}`}
              spark={cash.map((item) => item.out)}
              href="/admin/data/customer-purchases"
            />
            {billing && (
              <StatCard
                tone={net < 0 ? "orange" : "blue"}
                icon={Scale}
                label={net < 0 ? "Defisit Bulan Ini" : "Saldo Bersih Bulan Ini"}
                value={formatRupiah(net)}
                hint="Uang masuk dikurangi uang keluar"
                spark={cash.map((item) => Math.max(0, item.in - item.out))}
              />
            )}
            <StatCard
              tone="amber"
              icon={Clock}
              label="Belum Dibayar ke Luar"
              value={formatRupiah(total(unpaidOut))}
              hint={`${unpaidOut.length} tagihan pemasok dan gaji`}
              href="/admin/data/customer-purchases"
            />
          </StatGrid>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="Grafik Arus Kas" icon={ChartColumn} description="Uang masuk dan uang keluar 6 bulan terakhir, menurut tanggal bayar.">
              <BarChart
                data={cash.map((item) => ({ month: item.month, values: billing ? [item.in, item.out] : [item.out] }))}
                series={billing ? [chartSeries("Uang masuk", "green"), chartSeries("Uang keluar", "red")] : [chartSeries("Uang keluar", "red")]}
              />
            </Panel>
            <Panel
              title="Pembelian Perusahaan"
              icon={ShoppingBag}
              description={`Tagihan pemasok ${monthLabel.format(new Date(`${thisMonth}-01T00:00:00Z`))}`}
              action={
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/admin/data/customer-purchases">
                    Lihat
                    <ArrowRight />
                  </Link>
                </Button>
              }
            >
              <MoneyRows
                rows={[
                  { label: "Total tagihan", value: total(purchasesNow), hint: `${purchasesNow.length} pembelian` },
                  { label: "Sudah lunas", value: paidOf(purchasesNow), tone: "good" },
                  { label: "Belum lunas", value: total(unpaidOf(purchasesNow)), hint: `${unpaidOf(purchasesNow).length} pembelian`, tone: "warn" },
                ]}
              />
            </Panel>
            <Panel
              title="Gaji Karyawan"
              icon={Banknote}
              description={`Gaji ${monthLabel.format(new Date(`${thisMonth}-01T00:00:00Z`))} · ${activeEmployees.value} karyawan aktif`}
              action={
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/admin/data/salaries">
                    Lihat
                    <ArrowRight />
                  </Link>
                </Button>
              }
            >
              <MoneyRows
                rows={[
                  { label: "Total gaji bersih", value: total(salariesNow), hint: `${salariesNow.length} karyawan` },
                  { label: "Sudah dibayar", value: paidOf(salariesNow), tone: "good" },
                  { label: "Belum dibayar", value: total(unpaidOf(salariesNow)), hint: `${unpaidOf(salariesNow).length} karyawan`, tone: "warn" },
                ]}
              />
            </Panel>
          </div>
        </section>
      )}

      <div className={cn("grid gap-6", billing ? "xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-2")}>
        {billing && (
          <>
            <Panel title="Grafik Transaksi" icon={ChartColumn} description="Perbandingan total tagihan dan pembayaran 6 bulan terakhir.">
              <BarChart data={series.map((item) => ({ month: item.month, values: [item.total, item.paid] }))} series={[chartSeries("Total tagihan", "blue"), chartSeries("Pembayaran", "green")]} />
            </Panel>
            <Panel title="Status Pembayaran" icon={PieChart}>
              <PaymentDonut paid={paidRows.length} unpaid={unpaidRows.length} />
            </Panel>
          </>
        )}
        <Panel title="Status Sistem" icon={ServerCog}>
          <span
            className={cn(
              "-mt-2 mb-4 inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
              allOk ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
            )}
          >
            {allOk ? "Semua sistem berjalan normal" : "Ada yang perlu diperiksa"}
          </span>
          <ul className="flex flex-col gap-4">
            <SystemRow ok icon={Database} title="Database" detail="Neon Postgres terhubung." />
            <SystemRow ok={storage.ok} icon={Cloud} title="Penyimpanan media" detail={storage.detail} />
            <SystemRow ok={accurateOk} icon={ListChecks} title="Pencatatan Accurate" detail={accurateOk ? "Kredensial online terpasang." : "Accurate Online belum dihubungkan."} />
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        {billing ? (
          <Panel
            title="Transaksi Terbaru"
            icon={ReceiptText}
            description="Daftar transaksi invoice terbaru."
            action={
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/admin/data/invoices">
                  Lihat semua
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[#f3f6fc] text-left text-xs font-semibold text-foreground/80 dark:bg-white/5">
                  <tr>
                    <th className="py-2.5 pl-5">No. Invoice</th>
                    <th className="py-2.5">Pelanggan</th>
                    <th className="py-2.5">Tanggal terbit</th>
                    <th className="py-2.5">Jatuh tempo</th>
                    <th className="py-2.5">Total tagihan</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 pr-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-3 pl-5 font-medium whitespace-nowrap">{invoice.number}</td>
                      <td className="max-w-56 truncate py-3">{nameOf(invoice.customerId)}</td>
                      <td className="py-3 whitespace-nowrap text-muted-foreground">{formatDate(invoice.issueDate)}</td>
                      <td className="py-3 whitespace-nowrap text-muted-foreground">{formatDate(invoice.dueDate)}</td>
                      <td className="py-3 whitespace-nowrap tabular-nums">{formatRupiah(invoice.total)}</td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            invoice.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
                          )}
                        >
                          {invoiceStatusLabels[invoice.status] ?? invoice.status}
                        </span>
                      </td>
                      <td className="py-3 pr-5 text-right">
                        <Button asChild variant="ghost" size="icon-sm" className="text-brand-ink" aria-label={`Lihat ${invoice.number}`}>
                          <Link href={`/admin/invoice/${invoice.id}`}>
                            <Eye />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!recentInvoices.length && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        Belum ada invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <div />
        )}

        <div className="flex flex-col gap-6">
          <Panel
            title="Aktivitas Terakhir"
            icon={Clock}
            action={
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/admin/data/leads">
                  Prospek
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            {activities.length ? (
              <ul className="flex flex-col gap-3">
                {activities.map((activity, index) => {
                  const style = activityStyle[activity.kind];
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-white", style.className)}>
                        <style.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{activity.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(activity.at)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada aktivitas.</p>
            )}
          </Panel>

          {billing && (
            <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#1d4ed8,#2563eb_55%,#0ea5e9)] p-5 text-white shadow-[0_10px_30px_-12px_rgba(37,99,235,0.7)]">
              <FileText className="absolute -right-3 -bottom-4 size-32 rotate-12 text-white/15" aria-hidden="true" />
              <h2 className="text-lg font-bold">Kelola tagihan lebih mudah</h2>
              <p className="mt-1 max-w-64 text-sm text-blue-100">Generate, kirim, dan pantau pembayaran invoice pelanggan.</p>
              <Button asChild size="sm" className="relative mt-4 rounded-full bg-white text-blue-700 hover:bg-blue-50">
                <Link href="/admin/data/invoices">
                  Buat invoice baru
                  <ArrowRight />
                </Link>
              </Button>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

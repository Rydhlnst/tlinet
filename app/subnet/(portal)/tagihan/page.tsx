import { desc, eq } from "drizzle-orm";
import { CalendarClock, ChevronRight, CircleCheck, Clock, FileText, History, Landmark, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/admin/detail-panels";
import { BrandMark } from "@/components/site/brand";
import { CopyButton } from "@/components/site/copy-button";
import { PageHeading, SectionCard } from "@/components/site/subnet-ui";
import { paymentStatusLabels } from "@/lib/cms/entities";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customerPayments, invoices } from "@/lib/db/schema";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { invoicePublicPath } from "@/lib/invoices";
import { requireSubnetUser } from "@/lib/subnet";
import { cn } from "@/lib/utils";
import { daysUntil, todayWita } from "../dates";

export const metadata: Metadata = { title: "Tagihan · Portal Subnet" };

/** Invoice dan riwayat pembayaran pelanggan; hanya bisa dilihat. */
export default async function SubnetBillingPage() {
  const user = await requireSubnetUser();
  const db = requireDb();
  const [invoiceSettings, invoiceList, payments] = await Promise.all([
    getContent("invoice"),
    db.select().from(invoices).where(eq(invoices.customerId, user.customerId)).orderBy(desc(invoices.issueDate), desc(invoices.number)),
    db.select().from(customerPayments).where(eq(customerPayments.customerId, user.customerId)).orderBy(desc(customerPayments.period)),
  ]);

  const today = todayWita();
  const unpaid = invoiceList.filter((invoice) => invoice.status !== "paid");
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + invoice.total, 0);
  const nextDue = unpaid.map((invoice) => invoice.dueDate).sort()[0];
  const dueIn = nextDue ? daysUntil(nextDue, today) : 0;
  const hasBank = Boolean(invoiceSettings.bankName && invoiceSettings.bankAccountNumber);

  return (
    <>
      <PageHeading title="Tagihan" description="Invoice dan riwayat pembayaran layanan Anda." />

      {unpaid.length ? (
        <section className="relative isolate overflow-hidden surface-ink rounded-3xl p-5 text-white shadow-lg shadow-ink/15 sm:p-6">
          <div className="absolute -top-20 -right-16 -z-10 size-56 rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
          <BrandMark className="absolute -top-6 -right-6 -z-10 size-32 opacity-[0.07]" />
          <p className="text-sm text-white/60">Total belum dibayar</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatRupiah(unpaidTotal)}</p>
          <p className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", dueIn < 0 ? "bg-red-500/80" : "bg-white/10")}>
            <CalendarClock className="size-3.5" />
            {unpaid.length} invoice · {dueIn < 0 ? `terlambat ${-dueIn} hari` : dueIn === 0 ? "jatuh tempo hari ini" : `jatuh tempo ${formatDate(nextDue)}`}
          </p>
          {hasBank && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Landmark className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-white/70">Transfer ke {invoiceSettings.bankName}</p>
                  <p className="font-semibold tracking-wide tabular-nums select-all">{invoiceSettings.bankAccountNumber}</p>
                  {invoiceSettings.bankAccountHolder && <p className="truncate text-[11px] text-white/70">a.n. {invoiceSettings.bankAccountHolder}</p>}
                </div>
              </div>
              <CopyButton value={invoiceSettings.bankAccountNumber} className="shrink-0 bg-white text-ink hover:bg-white/90" />
            </div>
          )}
        </section>
      ) : (
        <section className="flex items-center gap-4 rounded-3xl border bg-card p-5 shadow-sm shadow-ink/5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CircleCheck className="size-6" />
          </span>
          <div>
            <p className="font-semibold">Semua tagihan lunas</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Tidak ada invoice yang perlu dibayar saat ini.</p>
          </div>
        </section>
      )}

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2">
        <SectionCard title="Invoice" icon={ScrollText}>
          {invoiceList.length ? (
            <ul className="flex flex-col gap-2 p-3">
              {invoiceList.map((invoice) => {
                const paid = invoice.status === "paid";
                const overdue = !paid && invoice.dueDate < today;
                const items = invoice.items.map((item) => item.description.trim()).filter(Boolean).join(", ");
                return (
                  <li key={invoice.id}>
                    <Link href={invoicePublicPath(invoice.id)} className="group flex items-center gap-3 rounded-2xl border bg-background p-3.5 transition-colors hover:border-brand/30 active:bg-muted/60">
                      <span
                        className={cn(
                          "hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex",
                          paid ? "bg-emerald-50 text-emerald-600" : overdue ? "bg-red-50 text-red-600" : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        <FileText className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{invoice.number}</p>
                          <p className="shrink-0 text-sm font-bold tabular-nums">{formatRupiah(invoice.total)}</p>
                        </div>
                        {items && <p className="mt-0.5 truncate text-xs text-muted-foreground">{items}</p>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">Jatuh tempo {formatDate(invoice.dueDate)}</span>
                          <span className="shrink-0 whitespace-nowrap">
                            <StatusPill tone={paid ? "good" : overdue ? "bad" : "warn"}>{paid ? "Lunas" : overdue ? "Terlambat" : "Belum dibayar"}</StatusPill>
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada invoice.</p>
          )}
        </SectionCard>

        <SectionCard title="Riwayat Pembayaran" icon={History}>
          <div id="riwayat" className="scroll-mt-24">
            {payments.length ? (
              <ol className="relative flex flex-col px-5 pt-2 pb-4">
                {payments.map((payment, index) => {
                  const paid = payment.status === "paid";
                  return (
                    <li key={payment.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {index < payments.length - 1 && <span className="absolute top-10 bottom-0 left-[1.1875rem] w-px bg-border" aria-hidden="true" />}
                      <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-card", paid ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-secondary-foreground")}>
                        {paid ? <CircleCheck className="size-5" /> : <Clock className="size-5" />}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{formatMonth(payment.period)}</p>
                          <p className="text-sm font-bold tabular-nums">{formatRupiah(payment.amount)}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {payment.paidDate ? `Dibayar ${formatDate(payment.paidDate)}` : "Belum ada tanggal bayar"}
                          {payment.method && ` · ${payment.method}`}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <StatusPill tone={paid ? "good" : "warn"}>{paymentStatusLabels[payment.status] ?? payment.status}</StatusPill>
                          {payment.proofUrl && (
                            <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-ink underline-offset-4 hover:underline">
                              Lihat bukti
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada pembayaran yang dicatat.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

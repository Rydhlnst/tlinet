import { desc, eq } from "drizzle-orm";
import { ChevronRight, CircleCheck, Clock, Landmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/site/copy-button";
import { PageHeading, SectionCard, StatusDot } from "@/components/site/subnet-ui";
import { paymentStatusLabels } from "@/lib/cms/entities";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customerPayments, invoices } from "@/lib/db/schema";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { invoicePublicPath } from "@/lib/invoices";
import { requireSubnetUser } from "@/lib/subnet";
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

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="px-4 pt-4 pb-4 sm:px-5">
          <p className="text-sm text-muted-foreground">Total belum dibayar</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRupiah(unpaidTotal)}</p>
          {unpaid.length ? (
            <StatusDot tone={dueIn < 0 ? "bad" : "warn"} className="mt-1.5">
              {unpaid.length} invoice · {dueIn < 0 ? `terlambat ${-dueIn} hari` : dueIn === 0 ? "jatuh tempo hari ini" : `jatuh tempo ${formatDate(nextDue)}`}
            </StatusDot>
          ) : (
            <StatusDot tone="good" className="mt-1.5">
              Semua tagihan lunas
            </StatusDot>
          )}
        </div>
        {unpaid.length > 0 && hasBank && (
          <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <Landmark className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Transfer ke {invoiceSettings.bankName}</p>
                <p className="font-mono text-[15px] font-semibold tracking-wide select-all">{invoiceSettings.bankAccountNumber}</p>
                {invoiceSettings.bankAccountHolder && <p className="truncate text-xs text-muted-foreground">a.n. {invoiceSettings.bankAccountHolder}</p>}
              </div>
            </div>
            <CopyButton value={invoiceSettings.bankAccountNumber} className="shrink-0 border bg-background hover:bg-muted" />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <SectionCard title="Invoice">
          {invoiceList.length ? (
            <ul className="divide-y border-t">
              {invoiceList.map((invoice) => {
                const paid = invoice.status === "paid";
                const overdue = !paid && invoice.dueDate < today;
                const items = invoice.items.map((item) => item.description.trim()).filter(Boolean).join(", ");
                return (
                  <li key={invoice.id}>
                    <Link href={invoicePublicPath(invoice.id)} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60 active:bg-muted sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{invoice.number}</p>
                          <p className="shrink-0 text-sm font-semibold tabular-nums">{formatRupiah(invoice.total)}</p>
                        </div>
                        {items && <p className="mt-0.5 truncate text-xs text-muted-foreground">{items}</p>}
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Jatuh tempo {formatDate(invoice.dueDate)}</span>
                          <StatusDot tone={paid ? "good" : overdue ? "bad" : "warn"} className="shrink-0">
                            {paid ? "Lunas" : overdue ? "Terlambat" : "Belum dibayar"}
                          </StatusDot>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada invoice.</p>
          )}
        </SectionCard>

        <SectionCard title="Riwayat pembayaran">
          <div id="riwayat" className="scroll-mt-24">
            {payments.length ? (
              <ul className="divide-y border-t">
                {payments.map((payment) => {
                  const paid = payment.status === "paid";
                  return (
                    <li key={payment.id} className="flex items-start gap-3.5 px-4 py-3.5 sm:px-5">
                      {paid ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{formatMonth(payment.period)}</p>
                          <p className="text-sm font-semibold tabular-nums">{formatRupiah(payment.amount)}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {payment.paidDate ? `Dibayar ${formatDate(payment.paidDate)}` : "Belum ada tanggal bayar"}
                          {payment.method && ` · ${payment.method}`}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3">
                          <StatusDot tone={paid ? "good" : "warn"}>{paymentStatusLabels[payment.status] ?? payment.status}</StatusDot>
                          {payment.proofUrl && (
                            <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-ink hover:underline">
                              Lihat bukti
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada pembayaran yang dicatat.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

import { desc } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { customerPayments, customerPurchases, dataCenterPayments, invoices, salaryPayments } from "@/lib/db/schema";

/**
 * Analitik keuangan HANYA-BACA untuk dipakai asisten AI dan laporan. Tidak ada satu pun fungsi di sini yang menulis ke
 * database. Aturannya sama dengan dashboard: arus kas dihitung di bulan uang benar-benar berpindah (tanggal bayar, atau
 * bulan tagihan bila tanggal bayar kosong), dan hanya baris berstatus "paid" yang dihitung sebagai kas masuk/keluar.
 */

/** Baris nominal seragam dari pembayaran pelanggan, pembelian, gaji, dan Data Center. */
type MoneyRow = { amount: number; status: string; paidDate: string; period: string };

type InvoiceRow = { id: string; number: string; status: string; issueDate: string; dueDate: string; total: number; customerId: string };

export type FinanceRows = {
  invoices: InvoiceRow[];
  payments: MoneyRow[];
  purchases: MoneyRow[];
  salaries: MoneyRow[];
  dataCenters: MoneyRow[];
};

/** "2026-11" untuk `total` bulan terakhir termasuk bulan berjalan (WITA/UTC+8), dari yang terlama. */
export function recentMonths(total: number): string[] {
  const now = new Date(Date.now() + 8 * 3600_000);
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (total - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

/** Bulan berjalan "2026-11" menurut WITA. */
export const currentMonth = () => recentMonths(1)[0];

/** Bulan sebelum `month`. */
export function previousMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

/** Memuat seluruh baris keuangan sekali jalan. Pemanggil bertanggung jawab memastikan izin "finance"/"billing". */
export async function loadFinanceRows(): Promise<FinanceRows> {
  const db = requireDb();
  const money = { amount: customerPayments.amount, status: customerPayments.status, paidDate: customerPayments.paidDate, period: customerPayments.period };
  const [invoiceRows, payments, purchases, salaries, dataCenters] = await Promise.all([
    db
      .select({ id: invoices.id, number: invoices.number, status: invoices.status, issueDate: invoices.issueDate, dueDate: invoices.dueDate, total: invoices.total, customerId: invoices.customerId })
      .from(invoices)
      .orderBy(desc(invoices.issueDate), desc(invoices.number)),
    db.select(money).from(customerPayments),
    db.select({ amount: customerPurchases.amount, status: customerPurchases.status, paidDate: customerPurchases.paidDate, period: customerPurchases.period }).from(customerPurchases),
    db.select({ amount: salaryPayments.amount, status: salaryPayments.status, paidDate: salaryPayments.paidDate, period: salaryPayments.period }).from(salaryPayments),
    db.select({ amount: dataCenterPayments.amount, status: dataCenterPayments.status, paidDate: dataCenterPayments.paidDate, period: dataCenterPayments.period }).from(dataCenterPayments),
  ]);
  return { invoices: invoiceRows, payments, purchases, salaries, dataCenters };
}

/** Bulan kas sebuah baris: tanggal bayar bila ada, selain itu bulan tagihannya. */
const cashMonth = (row: MoneyRow) => (row.paidDate || row.period).slice(0, 7);
const sum = (list: MoneyRow[]) => list.reduce((total, row) => total + row.amount, 0);
const paidIn = (list: MoneyRow[], month: string) => sum(list.filter((row) => row.status === "paid" && cashMonth(row) === month));

export type CashflowPoint = { month: string; in: number; out: number; purchases: number; dataCenters: number; salaries: number; net: number };

/** Arus kas (uang masuk vs keluar) per bulan untuk daftar bulan tertentu. */
export function cashflowSeries(rows: FinanceRows, months: string[]): CashflowPoint[] {
  return months.map((month) => {
    const purchases = paidIn(rows.purchases, month);
    const dataCenters = paidIn(rows.dataCenters, month);
    const salaries = paidIn(rows.salaries, month);
    const moneyIn = paidIn(rows.payments, month);
    const out = purchases + dataCenters + salaries;
    return { month, in: moneyIn, out, purchases, dataCenters, salaries, net: moneyIn - out };
  });
}

export type InvoicePoint = { month: string; total: number; paid: number; unpaid: number; count: number };

/** Tagihan (total vs terbayar) per bulan menurut tanggal terbit invoice. */
export function invoiceSeries(rows: FinanceRows, months: string[]): InvoicePoint[] {
  return months.map((month) => {
    const list = rows.invoices.filter((invoice) => invoice.issueDate.startsWith(month));
    const total = list.reduce((acc, item) => acc + item.total, 0);
    const paid = list.filter((item) => item.status === "paid").reduce((acc, item) => acc + item.total, 0);
    return { month, total, paid, unpaid: total - paid, count: list.length };
  });
}

/** Ringkasan satu bulan: arus kas + tagihan, plus perubahan dibanding bulan sebelumnya. */
export function monthSnapshot(rows: FinanceRows, month: string) {
  const [cash] = cashflowSeries(rows, [month]);
  const [cashPrev] = cashflowSeries(rows, [previousMonth(month)]);
  const [inv] = invoiceSeries(rows, [month]);
  const [invPrev] = invoiceSeries(rows, [previousMonth(month)]);
  const pct = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);
  return {
    month,
    cash,
    invoices: inv,
    change: {
      in: pct(cash.in, cashPrev.in),
      out: pct(cash.out, cashPrev.out),
      net: pct(cash.net, cashPrev.net),
      invoiceTotal: pct(inv.total, invPrev.total),
      invoicePaid: pct(inv.paid, invPrev.paid),
    },
  };
}

/** Piutang: invoice pelanggan yang belum lunas (uang yang MASUK ke perusahaan), terbesar dulu. */
export function receivables(rows: FinanceRows, limit = 10) {
  const unpaid = rows.invoices.filter((invoice) => invoice.status !== "paid");
  return {
    count: unpaid.length,
    total: unpaid.reduce((acc, item) => acc + item.total, 0),
    items: unpaid
      .slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((invoice) => ({ id: invoice.id, number: invoice.number, customerId: invoice.customerId, total: invoice.total, dueDate: invoice.dueDate, issueDate: invoice.issueDate })),
  };
}

/** Utang: pembelian, Data Center, dan gaji yang belum dibayar perusahaan (uang KELUAR tertunda). */
export function payables(rows: FinanceRows) {
  const tag = (list: MoneyRow[]) => list.filter((row) => row.status !== "paid");
  const purchases = tag(rows.purchases);
  const dataCenters = tag(rows.dataCenters);
  const salaries = tag(rows.salaries);
  return {
    purchases: { count: purchases.length, total: sum(purchases) },
    dataCenters: { count: dataCenters.length, total: sum(dataCenters) },
    salaries: { count: salaries.length, total: sum(salaries) },
    total: sum([...purchases, ...dataCenters, ...salaries]),
  };
}

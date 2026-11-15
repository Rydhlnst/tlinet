import { inArray } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import {
  cashflowSeries,
  currentMonth,
  invoiceSeries,
  loadFinanceRows,
  monthSnapshot,
  payables,
  receivables,
  recentMonths,
} from "@/lib/finance-analytics";
import { formatMonth, formatRupiah } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { ToolDef, ToolResult } from "@/lib/ai/types";

/** Tool analitik keuangan HANYA-BACA. Tidak satu pun menulis ke database. */

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const label = (month: string) => formatMonth(month);
/** Berapa bulan ke belakang diminta AI, dibatasi 1..12. */
const monthsBack = (value: unknown, fallback = 6) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : fallback;
};

const finance_overview: ToolDef = {
  name: "finance_overview",
  description:
    "Ringkasan keuangan satu bulan: uang masuk, uang keluar, saldo bersih, dan (bila punya akses tagihan) total & terbayar invoice, lengkap dengan perubahan dibanding bulan sebelumnya dan grafik arus kas 6 bulan terakhir. Pakai untuk pertanyaan umum 'bagaimana keuangan bulan ini'.",
  parameters: {
    type: "object",
    properties: { month: { type: "string", description: 'Bulan "YYYY-MM", mis. "2026-10". Kosongkan untuk bulan berjalan.' } },
    additionalProperties: false,
  },
  readOnly: true,
  permission: "finance",
  async handler(args, { admin }): Promise<ToolResult> {
    const rows = await loadFinanceRows();
    const month = typeof args.month === "string" && monthPattern.test(args.month) ? args.month : currentMonth();
    const snap = monthSnapshot(rows, month);
    const series = cashflowSeries(rows, recentMonths(6));
    const billing = can(admin, "billing");
    const arrow = (pct: number | null) => (pct === null ? "" : ` (${pct > 0 ? "+" : ""}${pct}% vs bln lalu)`);
    const lines = [
      `Keuangan ${label(month)}:`,
      `• Uang masuk: ${formatRupiah(snap.cash.in)}${arrow(snap.change.in)}`,
      `• Uang keluar: ${formatRupiah(snap.cash.out)}${arrow(snap.change.out)} — pemasok ${formatRupiah(snap.cash.purchases)}, Data Center ${formatRupiah(snap.cash.dataCenters)}, gaji ${formatRupiah(snap.cash.salaries)}`,
      `• Saldo bersih: ${formatRupiah(snap.cash.net)}${arrow(snap.change.net)}`,
    ];
    if (billing) {
      lines.push(`• Total tagihan invoice: ${formatRupiah(snap.invoices.total)}${arrow(snap.change.invoiceTotal)}, terbayar ${formatRupiah(snap.invoices.paid)}, belum ${formatRupiah(snap.invoices.unpaid)}`);
    }
    return {
      ok: true,
      summary: lines.join("\n"),
      data: { month, snapshot: snap },
      chart: {
        kind: "bar",
        title: `Arus kas 6 bulan terakhir`,
        unit: "rupiah",
        categories: series.map((point) => label(point.month)),
        series: [
          { label: "Uang masuk", tone: "green", values: series.map((point) => point.in) },
          { label: "Uang keluar", tone: "red", values: series.map((point) => point.out) },
        ],
      },
    };
  },
};

const finance_cashflow: ToolDef = {
  name: "finance_cashflow",
  description: "Arus kas (uang masuk vs uang keluar) per bulan untuk beberapa bulan terakhir, sebagai grafik batang. Pakai untuk tren pemasukan/pengeluaran.",
  parameters: {
    type: "object",
    properties: { months: { type: "integer", minimum: 1, maximum: 12, description: "Jumlah bulan ke belakang (default 6)." } },
    additionalProperties: false,
  },
  readOnly: true,
  permission: "finance",
  async handler(args): Promise<ToolResult> {
    const rows = await loadFinanceRows();
    const series = cashflowSeries(rows, recentMonths(monthsBack(args.months)));
    const totalIn = series.reduce((acc, point) => acc + point.in, 0);
    const totalOut = series.reduce((acc, point) => acc + point.out, 0);
    return {
      ok: true,
      summary: `Selama ${series.length} bulan terakhir: total uang masuk ${formatRupiah(totalIn)}, uang keluar ${formatRupiah(totalOut)}, selisih ${formatRupiah(totalIn - totalOut)}.`,
      data: { series },
      chart: {
        kind: "bar",
        title: "Arus kas per bulan",
        unit: "rupiah",
        categories: series.map((point) => label(point.month)),
        series: [
          { label: "Uang masuk", tone: "green", values: series.map((point) => point.in) },
          { label: "Uang keluar", tone: "red", values: series.map((point) => point.out) },
        ],
      },
    };
  },
};

const finance_invoices: ToolDef = {
  name: "finance_invoices",
  description: "Tagihan invoice per bulan: total ditagihkan vs sudah terbayar, sebagai grafik batang. Pakai untuk tren penagihan dan pelunasan.",
  parameters: {
    type: "object",
    properties: { months: { type: "integer", minimum: 1, maximum: 12, description: "Jumlah bulan ke belakang (default 6)." } },
    additionalProperties: false,
  },
  readOnly: true,
  permission: "billing",
  async handler(args): Promise<ToolResult> {
    const rows = await loadFinanceRows();
    const series = invoiceSeries(rows, recentMonths(monthsBack(args.months)));
    const total = series.reduce((acc, point) => acc + point.total, 0);
    const paid = series.reduce((acc, point) => acc + point.paid, 0);
    return {
      ok: true,
      summary: `Selama ${series.length} bulan terakhir: total ditagihkan ${formatRupiah(total)}, terbayar ${formatRupiah(paid)}, belum terbayar ${formatRupiah(total - paid)}.`,
      data: { series },
      chart: {
        kind: "bar",
        title: "Tagihan vs terbayar per bulan",
        unit: "rupiah",
        categories: series.map((point) => label(point.month)),
        series: [
          { label: "Total tagihan", tone: "blue", values: series.map((point) => point.total) },
          { label: "Terbayar", tone: "green", values: series.map((point) => point.paid) },
        ],
      },
    };
  },
};

const finance_receivables: ToolDef = {
  name: "finance_receivables",
  description: "Piutang: invoice pelanggan yang belum lunas (uang yang masih harus masuk), diurutkan dari nominal terbesar, plus perbandingan jumlah invoice lunas vs belum. Pakai untuk 'siapa yang belum bayar'.",
  parameters: {
    type: "object",
    properties: { limit: { type: "integer", minimum: 1, maximum: 50, description: "Banyak invoice teratas yang dirinci (default 10)." } },
    additionalProperties: false,
  },
  readOnly: true,
  permission: "billing",
  async handler(args): Promise<ToolResult> {
    const rows = await loadFinanceRows();
    const limit = Number.isFinite(Number(args.limit)) ? Math.min(50, Math.max(1, Math.round(Number(args.limit)))) : 10;
    const data = receivables(rows, limit);
    const ids = [...new Set(data.items.map((item) => item.customerId).filter(Boolean))];
    const names = ids.length ? await requireDb().select({ id: customers.id, company: customers.company, name: customers.name }).from(customers).where(inArray(customers.id, ids)) : [];
    const nameOf = (id: string) => {
      const customer = names.find((item) => item.id === id);
      return customer ? customer.company || customer.name : "—";
    };
    const items = data.items.map((item) => ({ ...item, customer: nameOf(item.customerId) }));
    const paidCount = rows.invoices.filter((invoice) => invoice.status === "paid").length;
    const top = items.slice(0, 5).map((item) => `${item.number} — ${item.customer}: ${formatRupiah(item.total)} (jatuh tempo ${item.dueDate})`);
    return {
      ok: true,
      summary: [`Piutang: ${data.count} invoice belum lunas, total ${formatRupiah(data.total)}.`, ...(top.length ? ["Terbesar:", ...top.map((line) => `• ${line}`)] : [])].join("\n"),
      data: { total: data.total, count: data.count, items },
      chart: {
        kind: "donut",
        title: "Status invoice",
        unit: "number",
        segments: [
          { label: "Lunas", value: paidCount, tone: "green" },
          { label: "Belum lunas", value: data.count, tone: "red" },
        ],
      },
    };
  },
};

const finance_payables: ToolDef = {
  name: "finance_payables",
  description: "Utang: pembelian pemasok, tagihan Data Center, dan gaji yang belum dibayar perusahaan (uang keluar yang masih tertunda), sebagai grafik batang. Pakai untuk 'apa yang belum kita bayar'.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  readOnly: true,
  permission: "finance",
  async handler(): Promise<ToolResult> {
    const rows = await loadFinanceRows();
    const data = payables(rows);
    return {
      ok: true,
      summary: `Utang belum dibayar: total ${formatRupiah(data.total)} — pemasok ${formatRupiah(data.purchases.total)} (${data.purchases.count}), Data Center ${formatRupiah(data.dataCenters.total)} (${data.dataCenters.count}), gaji ${formatRupiah(data.salaries.total)} (${data.salaries.count}).`,
      data,
      chart: {
        kind: "bar",
        title: "Utang belum dibayar",
        unit: "rupiah",
        categories: ["Pemasok", "Data Center", "Gaji"],
        series: [{ label: "Belum dibayar", tone: "amber", values: [data.purchases.total, data.dataCenters.total, data.salaries.total] }],
      },
    };
  },
};

export const financeTools: ToolDef[] = [finance_overview, finance_cashflow, finance_invoices, finance_receivables, finance_payables];

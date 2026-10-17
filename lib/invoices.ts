import { and, eq, like, ne } from "drizzle-orm";
import { linkCode } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import type { InvoiceSettings } from "@/lib/content/types";
import { customers, invoices, type InvoiceItem } from "@/lib/db/schema";
import { formatDate, formatRupiah, whatsappUrl } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";

/** Jatuh tempo bawaan, dihitung dari tanggal terbit. */
const dueInDays = 14;

/** Subtotal, PPN, dan total tagihan; PPN dibulatkan ke rupiah terdekat. */
export function invoiceTotals(items: InvoiceItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round((subtotal * taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/** Alamat publik invoice untuk pelanggan: /invoice/<id>/<kode>; tanpa kode yang cocok halamannya tidak ditemukan. */
export const invoicePublicUrl = (id: string) => absoluteUrl(`/invoice/${id}/${linkCode(`invoice:${id}`)}`);

/**
 * Tautan wa.me ke nomor telepon invoice dengan pesan berisi rincian tagihan dan tautan ke invoicenya,
 * atau kosong bila nomornya tidak ada.
 */
export function invoiceWhatsappUrl(invoice: typeof invoices.$inferSelect, settings: InvoiceSettings) {
  if (!invoice.phone.replace(/\D/g, "")) return "";
  const link = ["", "Lihat detail dan unduh invoice Anda di sini:", invoicePublicUrl(invoice.id)];
  const items = invoice.items.map((item) => item.description.trim()).filter(Boolean).join(", ");
  const details = [
    `Nomor Invoice: ${invoice.number}`,
    `Tanggal: ${formatDate(invoice.issueDate)}`,
    `Nominal: ${formatRupiah(invoice.total)}`,
    ...(items ? [`Item: ${items}`] : []),
  ];
  const bank =
    settings.bankName && settings.bankAccountNumber
      ? ["", "Pembayaran dapat ditransfer ke:", `Rekening ${settings.bankName}: ${settings.bankAccountNumber}`, ...(settings.bankAccountHolder ? [`a.n. ${settings.bankAccountHolder}`] : [])]
      : [];
  const lines =
    invoice.status === "paid"
      ? ["Pembayaran untuk tagihan berikut sudah kami terima:", "", ...details, ...link]
      : ["Berikut saya kirimkan rincian tagihan Anda:", "", ...details, `Jatuh Tempo: ${formatDate(invoice.dueDate)}`, ...link, ...bank];
  return whatsappUrl(invoice.phone, [`Halo Bapak/Ibu ${invoice.companyName},`, "", ...lines, "", "Terima kasih."].join("\n"));
}

/** Nomor berikutnya untuk tahun itu: INV-2026-000001, INV-2026-000002, … */
async function nextNumber(year: string) {
  const prefix = `INV-${year}-`;
  const rows = await requireDb().select({ number: invoices.number }).from(invoices).where(like(invoices.number, `${prefix}%`));
  const last = Math.max(0, ...rows.map((row) => Number(row.number.slice(prefix.length)) || 0));
  return `${prefix}${String(last + 1).padStart(6, "0")}`;
}

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

/**
 * Melengkapi isian invoice sebelum disimpan: tanggal dan PPN bawaan, data pelanggan untuk isian yang
 * dikosongkan, nomor otomatis, dan total. `raw` adalah isian asli form, untuk membedakan kosong dari nol.
 */
export async function prepareInvoice(values: Record<string, unknown>, raw: Record<string, unknown>, id: string, errors: string[]) {
  const db = requireDb();
  const blank = (name: string) => !String(values[name] ?? "").trim();

  if (blank("issueDate")) values.issueDate = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  if (blank("dueDate")) values.dueDate = addDays(String(values.issueDate), dueInDays);
  if (String(values.dueDate) < String(values.issueDate)) errors.push("Jatuh tempo tidak boleh sebelum tanggal terbit.");
  if (!blank("periodStart") && !blank("periodEnd") && String(values.periodEnd) < String(values.periodStart)) errors.push("Periode tagihan sampai tidak boleh sebelum periode mulai.");

  if (String(raw.taxRate ?? "").trim() === "") values.taxRate = (await getContent("invoice")).taxRate;

  let items = values.items as InvoiceItem[];
  const [customer] = blank("customerId") ? [] : await db.select().from(customers).where(eq(customers.id, String(values.customerId))).limit(1);
  if (customer) {
    const place = [customer.address, customer.district && `Kec. ${customer.district}`, customer.regency, customer.province].filter(Boolean).join(", ");
    const fill = (name: string, value: string) => {
      if (blank(name)) values[name] = value;
    };
    fill("companyName", customer.company || customer.name);
    // Nama orangnya menjadi PIC hanya bila pelanggan ini punya PT.
    fill("pic", customer.company ? customer.name : "");
    fill("address", place);
    fill("phone", customer.phone);
    fill("customerCode", customer.accurateNo || customer.siteId);
    fill("bandwidth", customer.capacity);
    fill("location", place);
    if (!items.length && customer.monthlyFee > 0) {
      items = [{ description: customer.capacity ? `Internet ${customer.capacity}` : "Layanan Internet", note: "", quantity: 1, unitPrice: customer.monthlyFee }];
      values.items = items;
    }
  }

  if (blank("companyName")) errors.push("Nama perusahaan wajib diisi, atau pilih pelanggannya.");
  if (!items.length) errors.push("Tambahkan minimal satu item tagihan.");
  values.total = invoiceTotals(items, Number(values.taxRate) || 0).total;

  const number = String(values.number ?? "").trim() || (await nextNumber(String(values.issueDate).slice(0, 4)));
  const clash = await db.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.number, number), ne(invoices.id, id))).limit(1);
  if (clash.length) errors.push("No. invoice sudah dipakai invoice lain.");
  values.number = number;
}

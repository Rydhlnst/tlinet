import { and, eq, ne } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { customerPayments, customers, invoices } from "@/lib/db/schema";

/** Tanggal hari ini di WITA, untuk tanggal bayar pembayaran yang ditandai lunas lewat invoicenya. */
const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

/**
 * Setiap invoice punya satu baris di History Pembayaran Subnet. Dipanggil setelah invoice disimpan atau statusnya
 * diubah: baris pembayarannya dibuat atau diperbarui (pelanggan, bulan terbit, total, status).
 *
 * Bila belum tertaut, pembayaran pelanggan itu di bulan yang sama yang belum punya invoice dipakai lebih dulu
 * agar tidak dobel. Pada tautan pertama itu, pembayaran yang sudah lunas membuat invoicenya ikut Paid.
 */
export async function syncInvoicePayment(invoiceId: string) {
  const db = requireDb();
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice?.customerId) return;
  const period = invoice.issueDate.slice(0, 7);

  let [payment] = await db.select().from(customerPayments).where(eq(customerPayments.invoiceId, invoiceId)).limit(1);
  let status = invoice.status === "paid" ? "paid" : "unpaid";
  if (!payment) {
    [payment] = await db
      .select()
      .from(customerPayments)
      .where(and(eq(customerPayments.customerId, invoice.customerId), eq(customerPayments.period, period), eq(customerPayments.invoiceId, "")))
      .limit(1);
    if (payment?.status === "paid" && status !== "paid") {
      status = "paid";
      await db.update(invoices).set({ status, updatedAt: new Date() }).where(eq(invoices.id, invoiceId));
    }
  }

  const values = {
    customerId: invoice.customerId,
    invoiceId,
    period,
    amount: invoice.total,
    status,
    paidDate: status === "paid" ? payment?.paidDate || today() : (payment?.paidDate ?? ""),
  };
  if (payment) {
    await db.update(customerPayments).set({ ...values, updatedAt: new Date() }).where(eq(customerPayments.id, payment.id));
  } else {
    const [owner] = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
    await db.insert(customerPayments).values({ ...values, id: crypto.randomUUID(), pic: owner?.name ?? "", note: `Invoice ${invoice.number}` });
  }
}

/** Status pembayaran yang diubah dari History Pembayaran Subnet ikut ke invoicenya. */
export async function syncPaymentInvoice(paymentId: string) {
  const db = requireDb();
  const [payment] = await db.select({ invoiceId: customerPayments.invoiceId, status: customerPayments.status }).from(customerPayments).where(eq(customerPayments.id, paymentId)).limit(1);
  if (!payment?.invoiceId) return;
  await db.update(invoices).set({ status: payment.status === "paid" ? "paid" : "unpaid", updatedAt: new Date() }).where(eq(invoices.id, payment.invoiceId));
}

/**
 * Pembayaran sebuah invoice ikut terhapus bersama invoicenya, kecuali yang sudah punya bukti transfer:
 * itu catatan pembayaran sungguhan, jadi hanya dilepas dari invoicenya.
 */
export async function deleteInvoicePayment(invoiceId: string) {
  const db = requireDb();
  await db.update(customerPayments).set({ invoiceId: "", updatedAt: new Date() }).where(and(eq(customerPayments.invoiceId, invoiceId), ne(customerPayments.proofUrl, "")));
  await db.delete(customerPayments).where(eq(customerPayments.invoiceId, invoiceId));
}

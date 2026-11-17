import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { customerPayments, customers } from "@/lib/db/schema";

export type PendingProof = { id: string; customerId: string; customer: string; at: string };

/**
 * Pembayaran yang BUKTI TRANSFERNYA sudah diunggah pelanggan (`proofAt` terisi) tapi belum ditandai lunas — perlu
 * diverifikasi admin. Dipakai untuk badge & notifikasi real-time di dashboard.
 */
export async function pendingPaymentProofs(limit = 50): Promise<{ count: number; items: PendingProof[] }> {
  const db = requireDb();
  const rows = await db
    .select({ id: customerPayments.id, at: customerPayments.proofAt, customerId: customerPayments.customerId, company: customers.company, name: customers.name })
    .from(customerPayments)
    .innerJoin(customers, eq(customers.id, customerPayments.customerId))
    .where(and(isNotNull(customerPayments.proofAt), ne(customerPayments.status, "paid")))
    .orderBy(desc(customerPayments.proofAt))
    .limit(limit);
  return {
    count: rows.length,
    items: rows.map((row) => ({ id: row.id, customerId: row.customerId, customer: row.company || row.name || "Pelanggan", at: row.at ? row.at.toISOString() : "" })),
  };
}

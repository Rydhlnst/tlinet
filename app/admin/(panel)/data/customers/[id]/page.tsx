import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerDetail, type LedgerState } from "@/components/admin/customer-detail";
import { accurateMode, getAccurateLedger } from "@/lib/accurate";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { customerPayments, customers } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Detail Pelanggan" };

/** Faktur dan pembayaran dari Accurate; kegagalan Accurate tidak boleh menjatuhkan halaman detailnya. */
async function loadLedger(accurateId: number | null): Promise<LedgerState> {
  if (!accurateId || accurateMode !== "ready") return null;
  try {
    return await getAccurateLedger(accurateId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Accurate tidak dapat dijangkau." };
  }
}

export default async function CustomerPage({ params }: PageProps<"/admin/data/customers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const db = requireDb();
  const [[customer], payments] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, id)).limit(1),
    db.select().from(customerPayments).where(eq(customerPayments.customerId, id)).orderBy(desc(customerPayments.period), desc(customerPayments.createdAt)),
  ]);
  if (!customer) notFound();

  return <CustomerDetail customer={customer} payments={payments} ledger={await loadLedger(customer.accurateId)} />;
}

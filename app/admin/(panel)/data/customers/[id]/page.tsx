import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerDetail, type LedgerState } from "@/components/admin/customer-detail";
import { accurateMode, getAccurateLedger } from "@/lib/accurate";
import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { withCustomerData } from "@/lib/cms/linked";
import { requireDb } from "@/lib/db";
import { customerPayments, customerPurchases, customers, invoices } from "@/lib/db/schema";

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
  const admin = await requireAdmin("customers");
  const access = { billing: can(admin, "billing"), finance: can(admin, "finance") };
  const { id } = await params;
  const db = requireDb();
  const [[customer], payments, purchases, customerInvoices] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, id)).limit(1),
    // Riwayat yang tidak boleh dilihat tidak dimuat sama sekali.
    access.billing ? db.select().from(customerPayments).where(eq(customerPayments.customerId, id)).orderBy(desc(customerPayments.period), desc(customerPayments.createdAt)) : [],
    access.finance ? db.select().from(customerPurchases).where(eq(customerPurchases.customerId, id)).orderBy(desc(customerPurchases.period), desc(customerPurchases.createdAt)) : [],
    access.billing ? db.select().from(invoices).where(eq(invoices.customerId, id)).orderBy(desc(invoices.issueDate), desc(invoices.createdAt)) : [],
  ]);
  if (!customer) notFound();

  return (
    <CustomerDetail
      customer={access.finance ? customer : { ...customer, napFee: 0 }}
      access={access}
      invoices={customerInvoices}
      payments={await withCustomerData("customer-payments", payments)}
      purchases={await withCustomerData("customer-purchases", purchases)}
      ledger={can(admin, "accurate") ? await loadLedger(customer.accurateId) : null}
    />
  );
}

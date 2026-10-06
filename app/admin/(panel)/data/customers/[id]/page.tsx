import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/admin/customer-detail";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { customerPayments, customers } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Detail Pelanggan" };

export default async function CustomerPage({ params }: PageProps<"/admin/data/customers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const db = requireDb();
  const [[customer], payments] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, id)).limit(1),
    db.select().from(customerPayments).where(eq(customerPayments.customerId, id)).orderBy(desc(customerPayments.period), desc(customerPayments.createdAt)),
  ]);
  if (!customer) notFound();

  return <CustomerDetail customer={customer} payments={payments} />;
}

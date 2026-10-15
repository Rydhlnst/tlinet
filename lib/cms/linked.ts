import { inArray } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";

type Customer = typeof customers.$inferSelect;

/**
 * Isian riwayat yang sumbernya Data Pelanggan: nama isian di riwayat → kolom pelanggan.
 * Riwayat menampilkan nilai terbaru dari pelanggannya, dan mengubahnya dari form riwayat ikut mengubah Data Pelanggan.
 */
export const customerLinkedFields: Record<string, Record<string, keyof Customer>> = {
  "customer-payments": { pic: "name" },
  "customer-purchases": { siteId: "siteId", cid: "cid", paymentNumber: "paymentNumber" },
};

/** Mengisi isian tertaut tiap baris dengan nilai terbaru dari pelanggannya. Nilai lama baris dipakai bila data pelanggannya kosong. */
export async function withCustomerData<T extends Record<string, unknown>>(entityKey: string, rows: T[]): Promise<T[]> {
  const linked = customerLinkedFields[entityKey];
  const ids = [...new Set(rows.map((row) => String(row.customerId ?? "")).filter(Boolean))];
  if (!linked || !ids.length) return rows;
  const owners = new Map((await requireDb().select().from(customers).where(inArray(customers.id, ids))).map((customer) => [customer.id, customer]));
  return rows.map((row) => {
    const owner = owners.get(String(row.customerId));
    if (!owner) return row;
    return { ...row, ...Object.fromEntries(Object.entries(linked).map(([key, source]) => [key, owner[source] || row[key]])) };
  });
}

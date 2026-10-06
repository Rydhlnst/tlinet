import { isNotNull } from "drizzle-orm";
import { getAccurateCustomer, listAccurateCustomers } from "@/lib/accurate";
import type { SaveResult } from "@/lib/cms/store";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";

/** Jumlah detail pelanggan yang diminta bersamaan, agar tidak menabrak batas pemanggilan API Accurate. */
const batchSize = 4;

/**
 * Menyalin pelanggan Accurate yang belum ada di dashboard. Pelanggan yang sudah tertaut tidak disentuh,
 * sehingga impor ulang tidak menimpa perubahan yang dibuat di dashboard.
 */
export async function importAccurateCustomers(): Promise<SaveResult> {
  const db = requireDb();
  const [remote, linked] = await Promise.all([
    listAccurateCustomers(),
    db.select({ accurateId: customers.accurateId }).from(customers).where(isNotNull(customers.accurateId)),
  ]);
  const known = new Set(linked.map((row) => row.accurateId));
  const missing = remote.filter((customer) => !known.has(customer.id));
  if (!missing.length) return { ok: true, message: `Semua ${remote.length} pelanggan Accurate sudah ada di dashboard.` };

  const rows: (typeof customers.$inferInsert)[] = [];
  for (let start = 0; start < missing.length; start += batchSize) {
    const details = await Promise.all(missing.slice(start, start + batchSize).map((customer) => getAccurateCustomer(customer.id)));
    for (const detail of details) {
      rows.push({
        id: crypto.randomUUID(),
        name: detail.name.slice(0, 300) || detail.customerNo,
        phone: detail.phone.slice(0, 300),
        regency: detail.city.slice(0, 300),
        province: detail.province.slice(0, 300),
        note: detail.street ? `Alamat: ${detail.street}`.slice(0, 2000) : "",
        status: detail.suspended ? "suspended" : "active",
        accurateId: detail.id,
        accurateNo: detail.customerNo,
      });
    }
  }
  const inserted = await db.insert(customers).values(rows).onConflictDoNothing().returning({ id: customers.id });
  return { ok: true, message: `${inserted.length} pelanggan diimpor dari Accurate.` };
}

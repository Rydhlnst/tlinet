import { randomUUID } from "node:crypto";
import { desc, eq, getTableColumns, inArray, lt, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { requireDb } from "@/lib/db";
import {
  articles,
  clients,
  communityMessages,
  coverageAreas,
  customerPayments,
  customerPurchases,
  customers,
  employees,
  faqs,
  invoices,
  leads,
  mediaAssets,
  metroOrders,
  packageCategories,
  packages,
  salaryPayments,
  staffUsers,
  subnetAccounts,
  trashItems,
  type TrashSnapshot,
} from "@/lib/db/schema";
import { can, type AdminUser, type Permission } from "@/lib/permissions";
import { deleteR2Object } from "@/lib/storage";

/**
 * Tempat Sampah: data yang dihapus dari dashboard disimpan sebagai salinan baris (per tabel) dan dikembalikan
 * dengan menulis ulang baris itu apa adanya. Isinya dibuang otomatis setelah 30 hari.
 */

export const trashRetentionDays = 30;

const tables: Record<string, PgTable> = {
  articles,
  clients,
  communityMessages,
  coverageAreas,
  customerPayments,
  customerPurchases,
  customers,
  employees,
  faqs,
  invoices,
  leads,
  mediaAssets,
  metroOrders,
  packageCategories,
  packages,
  salaryPayments,
  staffUsers,
  subnetAccounts,
};
/** Urutan pemulihan: induk dulu (pelanggan) sebelum data yang merujuknya (pesan Forum, akun Subnet). */
const restoreOrder = ["customers", "employees", "invoices"];

type Rows = Record<string, unknown>[];

/** Salinan baris yang cocok dengan `where`, untuk disimpan sebelum dihapus atau diubah. */
export async function snapshotRows(name: keyof typeof tables, where: SQL | undefined): Promise<{ table: string; rows: Rows }> {
  const rows = (await requireDb().select().from(tables[name]).where(where)) as Rows;
  return { table: name, rows };
}

/** Menyimpan satu penghapusan ke Tempat Sampah. Tabel tanpa baris tidak ikut disimpan. */
export async function moveToTrash(item: { kind: string; label: string; title: string; permission: Permission; deletedBy: string; tables: { table: string; rows: Rows }[]; files?: string[] }) {
  const snapshot: TrashSnapshot = { tables: item.tables.filter((entry) => entry.rows.length), files: item.files?.filter(Boolean) };
  if (!snapshot.tables.length) return;
  await requireDb()
    .insert(trashItems)
    .values({ id: randomUUID(), kind: item.kind, label: item.label, title: item.title.slice(0, 300) || item.label, permission: item.permission, snapshot, deletedBy: item.deletedBy });
}

export type TrashEntry = { id: string; kind: string; label: string; title: string; deletedBy: string; deletedAt: number; rows: number };

/** Isi Tempat Sampah yang boleh dilihat admin ini (sesuai hak aksesnya), yang terbaru di atas. Yang kedaluwarsa dibuang dulu. */
export async function listTrash(admin: AdminUser): Promise<TrashEntry[]> {
  await purgeExpired();
  const rows = await requireDb().select().from(trashItems).orderBy(desc(trashItems.createdAt));
  return rows
    .filter((row) => can(admin, row.permission as Permission))
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      title: row.title,
      deletedBy: row.deletedBy,
      deletedAt: row.createdAt.getTime(),
      rows: row.snapshot.tables.reduce((total, entry) => total + entry.rows.length, 0),
    }));
}

/** JSON menyimpan tanggal sebagai teks; kolom timestamp perlu Date lagi. */
function revive(table: PgTable, row: Record<string, unknown>) {
  const columns = getTableColumns(table) as Record<string, { columnType: string }>;
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => key in columns)
      .map(([key, value]) => [key, columns[key].columnType === "PgTimestamp" && typeof value === "string" ? new Date(value) : value]),
  );
}

function primaryKey(table: PgTable) {
  const column = Object.values(getTableColumns(table)).find((item) => item.primary);
  if (!column) throw new Error("Tabel tanpa primary key");
  return column;
}

/** Pesan yang lebih jelas untuk benturan saat memulihkan (mis. email atau nomor invoice sudah dipakai data baru). */
function restoreError(error: unknown) {
  const text = String((error as { cause?: { message?: string } })?.cause?.message ?? (error as Error)?.message ?? "");
  if (/duplicate key|unique/i.test(text)) return "Tidak bisa dikembalikan: ada data baru dengan nilai yang sama (mis. email atau nomor invoice). Ubah atau hapus data baru itu dulu.";
  return "Data tidak bisa dikembalikan. Coba lagi.";
}

/**
 * Mengembalikan satu isi Tempat Sampah: setiap baris ditulis ulang persis seperti saat dihapus (baris yang masih ada,
 * mis. pembayaran yang dilepas dari invoicenya, ikut dikembalikan ke keadaan semula), lalu isi itu keluar dari sampah.
 */
export async function restoreTrash(id: string, admin: AdminUser): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const db = requireDb();
  const [item] = await db.select().from(trashItems).where(eq(trashItems.id, id)).limit(1);
  if (!item) return { ok: false, message: "Data ini sudah tidak ada di Tempat Sampah." };
  if (!can(admin, item.permission as Permission)) return { ok: false, message: "Anda tidak punya akses untuk mengembalikan data ini." };
  const ordered = [...item.snapshot.tables].sort((a, b) => {
    const rank = (name: string) => (restoreOrder.includes(name) ? restoreOrder.indexOf(name) : restoreOrder.length);
    return rank(a.table) - rank(b.table);
  });
  try {
    for (const entry of ordered) {
      const table = tables[entry.table];
      if (!table) continue;
      const key = primaryKey(table);
      for (const raw of entry.rows) {
        const row = revive(table, raw);
        await db.insert(table).values(row).onConflictDoUpdate({ target: key, set: row });
      }
    }
  } catch (error) {
    console.error("[trash] gagal mengembalikan", id, error);
    return { ok: false, message: restoreError(error) };
  }
  await db.delete(trashItems).where(eq(trashItems.id, id));
  return { ok: true, message: `${item.label} “${item.title}” dikembalikan.` };
}

/** Membuang isi Tempat Sampah untuk selamanya, termasuk berkas yang masih disimpan (mis. gambar dari menu Media). */
async function purgeItems(ids: string[]) {
  if (!ids.length) return 0;
  const db = requireDb();
  const items = await db.select({ id: trashItems.id, snapshot: trashItems.snapshot }).from(trashItems).where(inArray(trashItems.id, ids));
  for (const item of items) {
    for (const url of item.snapshot.files ?? []) {
      try {
        await deleteR2Object(url);
      } catch (error) {
        console.error("[trash] berkas tidak terhapus", url, error);
      }
    }
  }
  await db.delete(trashItems).where(inArray(trashItems.id, items.map((item) => item.id)));
  return items.length;
}

export const purgeTrash = (id: string) => purgeItems([id]);

/** Mengosongkan seluruh Tempat Sampah (hanya owner). */
export async function emptyTrash() {
  const rows = await requireDb().select({ id: trashItems.id }).from(trashItems);
  return purgeItems(rows.map((row) => row.id));
}

async function purgeExpired() {
  const cutoff = new Date(Date.now() - trashRetentionDays * 86_400_000);
  const rows = await requireDb().select({ id: trashItems.id }).from(trashItems).where(lt(trashItems.createdAt, cutoff));
  await purgeItems(rows.map((row) => row.id));
}

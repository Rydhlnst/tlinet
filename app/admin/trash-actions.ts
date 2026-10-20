"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";
import type { SaveResult } from "@/lib/cms/store";
import { emptyTrash, purgeTrash, restoreTrash } from "@/lib/trash";

const expired: SaveResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };
const ownerOnly: SaveResult = { ok: false, message: "Hanya owner yang bisa menghapus permanen." };

/** Mengembalikan data dari Tempat Sampah; hak aksesnya diperiksa per data (mis. Keuangan untuk gaji). */
export async function restoreTrashAction(id: string): Promise<SaveResult> {
  const admin = await getAdmin();
  if (!admin) return expired;
  const result = await restoreTrash(String(id), admin);
  // Data yang kembali bisa muncul di halaman mana saja (tabel, portal, situs).
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Menghapus satu isi Tempat Sampah untuk selamanya (berkas Media ikut dibuang). Khusus owner. */
export async function purgeTrashAction(id: string): Promise<SaveResult> {
  const admin = await getAdmin();
  if (!admin) return expired;
  if (admin.role !== "owner") return ownerOnly;
  await purgeTrash(String(id));
  revalidatePath("/admin/sampah");
  return { ok: true, message: "Dihapus permanen." };
}

/** Mengosongkan Tempat Sampah. Khusus owner. */
export async function emptyTrashAction(): Promise<SaveResult> {
  const admin = await getAdmin();
  if (!admin) return expired;
  if (admin.role !== "owner") return ownerOnly;
  const count = await emptyTrash();
  revalidatePath("/admin/sampah");
  return { ok: true, message: count ? `${count} data dihapus permanen.` : "Tempat Sampah sudah kosong." };
}

"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminWith } from "@/lib/auth";
import type { SaveResult } from "@/lib/cms/store";
import { postAdminMessage } from "@/lib/community";
import { requireDb } from "@/lib/db";
import { communityMessages, subnetAccounts } from "@/lib/db/schema";

const expired: SaveResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };
const path = "/admin/komunitas";

/** Pesan admin di Komunitas Subnet (pengumuman atau balasan), tampil sebagai "Admin TLINET". */
export async function postCommunityAdminAction(body: string): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  const result = await postAdminMessage("Admin TLINET", body);
  if (!result.ok) return { ok: false, message: result.error };
  revalidatePath(path);
  return { ok: true, message: "Pesan terkirim ke Komunitas." };
}

/** Menyembunyikan pesan dari Komunitas. Pesannya tetap tersimpan sebagai catatan moderasi. */
export async function deleteCommunityMessageAction(id: string): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  const [row] = await requireDb()
    .update(communityMessages)
    .set({ deletedAt: new Date() })
    .where(and(eq(communityMessages.id, String(id)), isNull(communityMessages.deletedAt)))
    .returning({ id: communityMessages.id });
  if (!row) return { ok: false, message: "Pesan tidak ditemukan atau sudah dihapus." };
  revalidatePath(path);
  return { ok: true, message: "Pesan dihapus dari Komunitas." };
}

/** Membisukan (atau mengaktifkan lagi) pelanggan di Komunitas: yang dibisukan masih bisa membaca. */
export async function setChatMutedAction(customerId: string, muted: boolean): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  const [row] = await requireDb()
    .update(subnetAccounts)
    .set({ chatMuted: Boolean(muted), updatedAt: new Date() })
    .where(eq(subnetAccounts.customerId, String(customerId)))
    .returning({ id: subnetAccounts.customerId });
  if (!row) return { ok: false, message: "Akun Subnet pelanggan tidak ditemukan." };
  revalidatePath(path);
  return { ok: true, message: muted ? "Pelanggan dibisukan di Komunitas." : "Pelanggan bisa mengirim pesan lagi." };
}

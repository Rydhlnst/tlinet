"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminWith } from "@/lib/auth";
import type { SaveResult } from "@/lib/cms/store";
import { forumAdminName, postAdminMessage, removeCommunityImage } from "@/lib/community";
import { requireDb } from "@/lib/db";
import { communityMessages, subnetAccounts } from "@/lib/db/schema";

const expired: SaveResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };
const path = "/admin/forum";

/** Pesan admin di Forum Subnet (pengumuman atau balasan), tampil sebagai PT.Trans Link Internasional. */
export async function postCommunityAdminAction(body: string): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  const result = await postAdminMessage(forumAdminName, body);
  if (!result.ok) return { ok: false, message: result.error };
  revalidatePath(path);
  return { ok: true, message: "Pesan terkirim ke Forum." };
}

/** Menyembunyikan pesan dari Forum. Teksnya tetap tersimpan sebagai catatan moderasi; gambarnya dibuang dari penyimpanan. */
export async function deleteCommunityMessageAction(id: string): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  const db = requireDb();
  const [message] = await db.select({ imageUrl: communityMessages.imageUrl }).from(communityMessages).where(eq(communityMessages.id, String(id))).limit(1);
  const [row] = await db
    .update(communityMessages)
    .set({ deletedAt: new Date(), imageUrl: "" })
    .where(and(eq(communityMessages.id, String(id)), isNull(communityMessages.deletedAt)))
    .returning({ id: communityMessages.id });
  if (!row) return { ok: false, message: "Pesan tidak ditemukan atau sudah dihapus." };
  if (message?.imageUrl) await removeCommunityImage(message.imageUrl);
  revalidatePath(path);
  return { ok: true, message: "Pesan dihapus dari Forum." };
}

/** Membisukan (atau mengaktifkan lagi) pelanggan di Forum: yang dibisukan masih bisa membaca. */
export async function setChatMutedAction(customerId: string, muted: boolean): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  const [row] = await requireDb()
    .update(subnetAccounts)
    .set({ chatMuted: Boolean(muted), updatedAt: new Date() })
    .where(eq(subnetAccounts.customerId, String(customerId)))
    .returning({ id: subnetAccounts.customerId });
  if (!row) return { ok: false, message: "Akun Subnet pelanggan tidak ditemukan." };
  revalidatePath(path);
  return { ok: true, message: muted ? "Pelanggan dibisukan di Forum." : "Pelanggan bisa mengirim pesan lagi." };
}

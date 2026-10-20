import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { communityMessages, customers, subnetAccounts } from "@/lib/db/schema";

/** Komunitas Subnet: satu ruang obrolan untuk semua pelanggan Subnet, dibaca ulang tiap beberapa detik oleh portal. */

export const communityMaxLength = 1000;
/** Jeda minimal antarpesan dari satu pelanggan, supaya ruang obrolan tidak dibanjiri. */
export const communityCooldownMs = 2000;
const historySize = 80;

/** `mine`: dikirim oleh pelanggan yang sedang melihat. Nama pelanggan ditampilkan sebagai nama PT-nya. */
export type ChatMessage = { id: string; mine: boolean; admin: boolean; name: string; photoUrl: string; body: string; at: number };

/** Pesan terbaru yang belum dihapus, dari yang terlama ke yang terbaru. */
export async function listCommunityMessages(viewerCustomerId: string | null): Promise<ChatMessage[]> {
  const rows = await requireDb()
    .select({
      id: communityMessages.id,
      customerId: communityMessages.customerId,
      isAdmin: communityMessages.isAdmin,
      authorName: communityMessages.authorName,
      body: communityMessages.body,
      createdAt: communityMessages.createdAt,
      company: customers.company,
      name: customers.name,
      photos: customers.photos,
      photoUrl: subnetAccounts.photoUrl,
    })
    .from(communityMessages)
    .leftJoin(customers, eq(customers.id, communityMessages.customerId))
    .leftJoin(subnetAccounts, eq(subnetAccounts.customerId, communityMessages.customerId))
    .where(isNull(communityMessages.deletedAt))
    .orderBy(desc(communityMessages.createdAt))
    .limit(historySize);
  return rows.reverse().map((row) => ({
    id: row.id,
    mine: Boolean(viewerCustomerId && row.customerId === viewerCustomerId),
    admin: row.isAdmin,
    name: row.isAdmin ? row.authorName || "Admin TLINET" : row.company || row.name || row.authorName || "Pelanggan",
    photoUrl: row.isAdmin ? "" : row.photoUrl || row.photos?.[0] || "",
    body: row.body,
    at: row.createdAt.getTime(),
  }));
}

/** Isi pesan yang sudah dirapikan, atau pesan galat untuk pengirim. */
export function cleanMessage(input: unknown): { body: string } | { error: string } {
  // Baris kosong berlebih dipadatkan; spasi di dalam baris dibiarkan.
  const body = String(input ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!body) return { error: "Pesan masih kosong." };
  if (body.length > communityMaxLength) return { error: `Pesan terlalu panjang (maksimal ${communityMaxLength} karakter).` };
  return { body };
}

/** Menyimpan pesan pelanggan. Ditolak bila akunnya dibisukan atau pesan sebelumnya baru saja dikirim. */
export async function postCustomerMessage(customerId: string, input: unknown): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const cleaned = cleanMessage(input);
  if ("error" in cleaned) return { ok: false, error: cleaned.error, status: 400 };
  const db = requireDb();
  const [[account], [last]] = await Promise.all([
    db.select({ muted: subnetAccounts.chatMuted }).from(subnetAccounts).where(eq(subnetAccounts.customerId, customerId)).limit(1),
    db
      .select({ createdAt: communityMessages.createdAt })
      .from(communityMessages)
      .where(and(eq(communityMessages.customerId, customerId), isNull(communityMessages.deletedAt)))
      .orderBy(desc(communityMessages.createdAt))
      .limit(1),
  ]);
  if (account?.muted) return { ok: false, error: "Akun Anda dibisukan admin di Komunitas. Hubungi admin TLINET.", status: 403 };
  if (last && Date.now() - last.createdAt.getTime() < communityCooldownMs) return { ok: false, error: "Tunggu sebentar sebelum mengirim pesan lagi.", status: 429 };
  await db.insert(communityMessages).values({ id: randomUUID(), customerId, body: cleaned.body });
  return { ok: true };
}

/** Menyimpan pesan admin (pengumuman atau balasan), tampil dengan nama `authorName`. */
export async function postAdminMessage(authorName: string, input: unknown) {
  const cleaned = cleanMessage(input);
  if ("error" in cleaned) return { ok: false as const, error: cleaned.error };
  await requireDb().insert(communityMessages).values({ id: randomUUID(), customerId: null, isAdmin: true, authorName, body: cleaned.body });
  return { ok: true as const };
}

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gt, gte, isNull, ne, or } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { communityMessages, customers, mediaAssets, subnetAccounts } from "@/lib/db/schema";
import { deleteR2Object, isR2Url } from "@/lib/storage";
import { storeUpload } from "@/lib/uploads";

/** Forum Subnet: satu ruang obrolan untuk semua pelanggan Subnet, dibaca ulang tiap beberapa detik oleh portal. */

export const communityMaxLength = 1000;
/** Jeda minimal antarpesan dari satu pelanggan, supaya ruang obrolan tidak dibanjiri. */
export const communityCooldownMs = 2000;
/**
 * Gambar sudah diperkecil di perangkat pengirim (WebP/JPEG, sisi terpanjang ±1280 px), jadi batas server kecil.
 * Jumlah gambar per pelanggan per hari juga dibatasi supaya penyimpanan tidak cepat penuh.
 */
export const communityImageMaxBytes = 600 * 1024;
export const communityImagesPerDay = 30;
const historySize = 80;
/** Nama yang tampil untuk semua pesan admin, termasuk pesan lama yang tersimpan dengan nama sebelumnya. */
export const forumAdminName = "PT.Trans Link Internasional";

/** `mine`: dikirim oleh pelanggan yang sedang melihat. Nama pelanggan ditampilkan sebagai nama PT-nya. */
/** `region`: kabupaten pengirim, satu-satunya data lain yang tampil di kartu profil Forum. */
export type ChatMessage = { id: string; mine: boolean; admin: boolean; name: string; photoUrl: string; region: string; body: string; imageUrl: string; at: number };

/** Pesan terbaru yang belum dihapus, dari yang terlama ke yang terbaru. */
export async function listCommunityMessages(viewerCustomerId: string | null): Promise<ChatMessage[]> {
  const rows = await requireDb()
    .select({
      id: communityMessages.id,
      customerId: communityMessages.customerId,
      isAdmin: communityMessages.isAdmin,
      authorName: communityMessages.authorName,
      body: communityMessages.body,
      imageUrl: communityMessages.imageUrl,
      createdAt: communityMessages.createdAt,
      company: customers.company,
      name: customers.name,
      regency: customers.regency,
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
    name: row.isAdmin ? forumAdminName : row.company || row.name || row.authorName || "Pelanggan",
    photoUrl: row.isAdmin ? "" : row.photoUrl || row.photos?.[0] || "",
    region: row.isAdmin ? "" : (row.regency ?? "").trim(),
    body: row.body,
    imageUrl: row.imageUrl,
    at: row.createdAt.getTime(),
  }));
}

/** Isi pesan yang sudah dirapikan, atau pesan galat untuk pengirim. Teks boleh kosong bila ada gambar. */
export function cleanMessage(input: unknown, hasImage = false): { body: string } | { error: string } {
  // Baris kosong berlebih dipadatkan; spasi di dalam baris dibiarkan.
  const body = String(input ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!body && !hasImage) return { error: "Pesan masih kosong." };
  if (body.length > communityMaxLength) return { error: `Pesan terlalu panjang (maksimal ${communityMaxLength} karakter).` };
  return { body };
}

/** Jenis gambar dari beberapa byte pertamanya (bukan dari label yang dikirim peramban): WebP atau JPEG saja. */
function imageKind(bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mimeType: "image/webp", extension: "webp" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mimeType: "image/jpeg", extension: "jpg" };
  return null;
}

/**
 * Menyimpan pesan pelanggan, dengan atau tanpa gambar. Ditolak bila akunnya dibisukan, pesan sebelumnya baru saja
 * dikirim, atau jatah gambar hari ini sudah habis.
 */
export async function postCustomerMessage(customerId: string, input: unknown, image?: File | null): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const cleaned = cleanMessage(input, Boolean(image));
  if ("error" in cleaned) return { ok: false, error: cleaned.error, status: 400 };
  const db = requireDb();
  const dayAgo = new Date(Date.now() - 86_400_000);
  const [[account], [last], [images]] = await Promise.all([
    db.select({ muted: subnetAccounts.chatMuted }).from(subnetAccounts).where(eq(subnetAccounts.customerId, customerId)).limit(1),
    db
      .select({ createdAt: communityMessages.createdAt })
      .from(communityMessages)
      .where(and(eq(communityMessages.customerId, customerId), isNull(communityMessages.deletedAt)))
      .orderBy(desc(communityMessages.createdAt))
      .limit(1),
    image
      ? db
          .select({ value: count() })
          .from(communityMessages)
          .where(and(eq(communityMessages.customerId, customerId), ne(communityMessages.imageUrl, ""), gte(communityMessages.createdAt, dayAgo)))
      : Promise.resolve([{ value: 0 }]),
  ]);
  if (account?.muted) return { ok: false, error: "Akun Anda dibisukan admin di Forum. Hubungi admin TLINET.", status: 403 };
  if (last && Date.now() - last.createdAt.getTime() < communityCooldownMs) return { ok: false, error: "Tunggu sebentar sebelum mengirim pesan lagi.", status: 429 };

  let imageUrl = "";
  if (image) {
    if (images.value >= communityImagesPerDay) return { ok: false, error: `Batas ${communityImagesPerDay} gambar per hari sudah tercapai. Coba lagi besok.`, status: 429 };
    if (image.size > communityImageMaxBytes) return { ok: false, error: "Gambar terlalu besar. Coba kirim ulang.", status: 413 };
    const body = await image.arrayBuffer();
    const kind = imageKind(new Uint8Array(body.slice(0, 12)));
    if (!kind) return { ok: false, error: "Format gambar tidak didukung.", status: 415 };
    const stored = await storeUpload({ body, filename: `forum-${Date.now()}.${kind.extension}`, ...kind });
    if (!stored.ok) return { ok: false, error: stored.error, status: stored.status };
    imageUrl = stored.url;
  }
  await db.insert(communityMessages).values({ id: randomUUID(), customerId, body: cleaned.body, imageUrl });
  return { ok: true };
}

/** Pesan baru dari orang lain sejak pelanggan terakhir membuka Forum, untuk titik merah dan notifikasi. */
export type ForumUnread = { count: number; latest: { id: string; name: string; text: string; at: number } | null };

/** Tanpa catatan buka Forum (belum pernah membuka), hanya pesan 3 hari terakhir yang dihitung. */
const unreadWindowMs = 3 * 86_400_000;

export async function forumUnread(customerId: string): Promise<ForumUnread> {
  const db = requireDb();
  const [account] = await db.select({ readAt: subnetAccounts.forumReadAt }).from(subnetAccounts).where(eq(subnetAccounts.customerId, customerId)).limit(1);
  const since = account?.readAt ?? new Date(Date.now() - unreadWindowMs);
  // Pesan admin (customerId kosong) juga dihitung; pesan sendiri tidak.
  const fromOthers = and(isNull(communityMessages.deletedAt), gt(communityMessages.createdAt, since), or(isNull(communityMessages.customerId), ne(communityMessages.customerId, customerId)));
  const [[{ value }], [latest]] = await Promise.all([
    db.select({ value: count() }).from(communityMessages).where(fromOthers),
    db
      .select({ id: communityMessages.id, isAdmin: communityMessages.isAdmin, body: communityMessages.body, imageUrl: communityMessages.imageUrl, createdAt: communityMessages.createdAt, company: customers.company, name: customers.name })
      .from(communityMessages)
      .leftJoin(customers, eq(customers.id, communityMessages.customerId))
      .where(fromOthers)
      .orderBy(desc(communityMessages.createdAt))
      .limit(1),
  ]);
  return {
    count: value,
    latest: latest
      ? {
          id: latest.id,
          name: latest.isAdmin ? forumAdminName : latest.company || latest.name || "Pelanggan",
          text: latest.body ? latest.body.slice(0, 120) : latest.imageUrl ? "📷 Gambar" : "",
          at: latest.createdAt.getTime(),
        }
      : null,
  };
}

/** Menandai Forum sudah dibaca: dipanggil setiap Forum terbuka dan memuat pesan. */
export async function markForumRead(customerId: string) {
  await requireDb().update(subnetAccounts).set({ forumReadAt: new Date() }).where(eq(subnetAccounts.customerId, customerId));
}

/** Menyimpan pesan admin (pengumuman atau balasan), tampil dengan nama `authorName`. */
export async function postAdminMessage(authorName: string, input: unknown) {
  const cleaned = cleanMessage(input);
  if ("error" in cleaned) return { ok: false as const, error: cleaned.error };
  await requireDb().insert(communityMessages).values({ id: randomUUID(), customerId: null, isAdmin: true, authorName, body: cleaned.body });
  return { ok: true as const };
}

/** Membuang berkas gambar pesan yang dihapus (R2, atau baris media di database) supaya tidak memenuhi penyimpanan. */
export async function removeCommunityImage(url: string) {
  if (!url) return;
  try {
    if (isR2Url(url)) await deleteR2Object(url);
    // Setiap unggahan juga tercatat di tabel media (berisi datanya sendiri bila tanpa R2).
    await requireDb().delete(mediaAssets).where(eq(mediaAssets.url, url));
  } catch (error) {
    console.error("[forum] gambar tidak terhapus", url, error);
  }
}

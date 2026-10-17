import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { putR2Object, storageMode } from "@/lib/storage";

/** Mencatat berkas di tabel media; gangguan sesaat ke database dicoba sekali lagi. */
async function record(values: typeof mediaAssets.$inferInsert) {
  try {
    await db!.insert(mediaAssets).values(values);
  } catch {
    // Percobaan pertama bisa saja sudah tersimpan walau jawabannya hilang di jalan.
    await db!.insert(mediaAssets).values(values).onConflictDoNothing();
  }
}

export type StoredUpload = { ok: true; id: string; url: string } | { ok: false; error: string; status: number };

/**
 * Menyimpan berkas yang sudah diperiksa jenis dan ukurannya: ke Cloudflare R2 bila diatur, kalau tidak ke database
 * (disajikan lewat /media/<id>). Dipakai unggahan dashboard dan foto profil portal Subnet.
 */
export async function storeUpload(file: { body: ArrayBuffer; filename: string; mimeType: string; extension: string }): Promise<StoredUpload> {
  if (!db) return { ok: false, error: "Database belum diatur.", status: 500 };
  if (storageMode === "incomplete") return { ok: false, error: "Konfigurasi Cloudflare R2 belum lengkap. Lengkapi semua variabel R2_* atau kosongkan semuanya.", status: 500 };

  const id = crypto.randomUUID();
  const size = file.body.byteLength;
  const base = { id, filename: file.filename.slice(0, 160) || `gambar.${file.extension}`, mimeType: file.mimeType, size };

  let url = file.extension === "pdf" ? `/media/${id}.pdf` : `/media/${id}`;
  if (storageMode === "r2") {
    try {
      url = await putR2Object(`uploads/${Date.now()}-${id}.${file.extension}`, file.body, file.mimeType);
    } catch (error) {
      console.error("[upload] penyimpanan menolak", { size, type: file.mimeType }, error);
      return { ok: false, error: `Gambar tidak dapat disimpan. ${error instanceof Error ? error.message : "Silakan coba lagi."}`, status: 502 };
    }
  }
  try {
    await record(storageMode === "r2" ? { ...base, url } : { ...base, url, data: Buffer.from(file.body).toString("base64") });
  } catch (error) {
    console.error("[upload] gagal mencatat media", { size, type: file.mimeType }, error);
    return { ok: false, error: "Gambar terunggah tetapi gagal dicatat di database. Silakan coba lagi.", status: 502 };
  }
  return { ok: true, id, url };
}

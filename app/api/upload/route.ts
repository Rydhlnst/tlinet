import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { putR2Object, storageMode } from "@/lib/storage";

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const maxFileSize = 4 * 1024 * 1024;
/** PDF hanya untuk isian yang memintanya (bukti transfer), supaya tidak terpilih sebagai gambar sampul atau logo. */
const pdfType = "application/pdf";

/** Unggahan ke bucket di wilayah lain bisa makan beberapa detik; batas bawaan fungsi terlalu sempit untuk itu. */
export const maxDuration = 30;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Mencatat berkas di tabel media; gangguan sesaat ke database dicoba sekali lagi. */
async function record(values: typeof mediaAssets.$inferInsert) {
  try {
    await db!.insert(mediaAssets).values(values);
  } catch {
    // Percobaan pertama bisa saja sudah tersimpan walau jawabannya hilang di jalan.
    await db!.insert(mediaAssets).values(values).onConflictDoNothing();
  }
}

export async function POST(request: Request) {
  if (!(await getAdmin())) return fail("Sesi berakhir. Silakan masuk kembali.", 401);
  if (!db) return fail("Database belum diatur.", 500);
  if (storageMode === "incomplete") return fail("Konfigurasi Cloudflare R2 belum lengkap. Lengkapi semua variabel R2_* atau kosongkan semuanya.", 500);

  const form = await request.formData();
  const file = form.get("file");
  const allowPdf = form.get("allowPdf") === "1";
  if (!(file instanceof File)) return fail("File wajib dipilih.", 400);
  const isPdf = allowPdf && file.type === pdfType;
  const extension = isPdf ? "pdf" : allowed.get(file.type);
  if (!extension) return fail(allowPdf ? "Gunakan gambar JPG, PNG, WebP, AVIF, atau berkas PDF." : "Gunakan gambar JPG, PNG, WebP, atau AVIF.", 400);
  if (file.size > maxFileSize) return fail(isPdf ? "Ukuran PDF maksimal 4 MB." : "Ukuran gambar maksimal 4 MB.", 400);

  const id = crypto.randomUUID();
  const body = await file.arrayBuffer();
  const base = { id, filename: file.name.slice(0, 160) || `gambar.${extension}`, mimeType: file.type, size: file.size };

  // Tanpa R2, gambar disimpan di database dan disajikan lewat /media/<id>.
  let url = isPdf ? `/media/${id}.pdf` : `/media/${id}`;
  if (storageMode === "r2") {
    try {
      url = await putR2Object(`uploads/${Date.now()}-${id}.${extension}`, body, file.type);
    } catch (error) {
      console.error("[upload] penyimpanan menolak", { size: file.size, type: file.type }, error);
      return fail(`Gambar tidak dapat disimpan. ${error instanceof Error ? error.message : "Silakan coba lagi."}`, 502);
    }
  }
  try {
    await record(storageMode === "r2" ? { ...base, url } : { ...base, url, data: Buffer.from(body).toString("base64") });
  } catch (error) {
    console.error("[upload] gagal mencatat media", { size: file.size, type: file.type }, error);
    return fail("Gambar terunggah tetapi gagal dicatat di database. Silakan coba lagi.", 502);
  }
  return NextResponse.json({ id, url });
}

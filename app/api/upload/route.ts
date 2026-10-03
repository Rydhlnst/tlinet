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

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  if (!(await getAdmin())) return fail("Sesi berakhir. Silakan masuk kembali.", 401);
  if (!db) return fail("Database belum diatur.", 500);
  if (storageMode === "incomplete") return fail("Konfigurasi Cloudflare R2 belum lengkap. Lengkapi semua variabel R2_* atau kosongkan semuanya.", 500);

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return fail("File wajib dipilih.", 400);
  const extension = allowed.get(file.type);
  if (!extension) return fail("Gunakan gambar JPG, PNG, WebP, atau AVIF.", 400);
  if (file.size > maxFileSize) return fail("Ukuran gambar maksimal 4 MB.", 400);

  const id = crypto.randomUUID();
  const body = await file.arrayBuffer();
  const base = { id, filename: file.name.slice(0, 160) || `gambar.${extension}`, mimeType: file.type, size: file.size };

  try {
    if (storageMode === "r2") {
      const url = await putR2Object(`uploads/${Date.now()}-${id}.${extension}`, body, file.type);
      await db.insert(mediaAssets).values({ ...base, url });
      return NextResponse.json({ id, url });
    }
    // Tanpa R2, gambar disimpan di database dan disajikan lewat /media/<id>.
    const url = `/media/${id}`;
    await db.insert(mediaAssets).values({ ...base, url, data: Buffer.from(body).toString("base64") });
    return NextResponse.json({ id, url });
  } catch {
    return fail("Unggahan gagal. Silakan coba lagi.", 502);
  }
}

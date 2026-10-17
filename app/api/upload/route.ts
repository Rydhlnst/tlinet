import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { storeUpload } from "@/lib/uploads";

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

export async function POST(request: Request) {
  if (!(await getAdmin())) return fail("Sesi berakhir. Silakan masuk kembali.", 401);
  const form = await request.formData();
  const file = form.get("file");
  const allowPdf = form.get("allowPdf") === "1";
  const jpgPngOnly = form.get("jpgPng") === "1";
  if (!(file instanceof File)) return fail("File wajib dipilih.", 400);
  if (jpgPngOnly && file.type !== "image/jpeg" && file.type !== "image/png") return fail("Hanya gambar JPG atau PNG yang diterima.", 400);
  const isPdf = allowPdf && file.type === pdfType;
  const extension = isPdf ? "pdf" : allowed.get(file.type);
  if (!extension) return fail(allowPdf ? "Gunakan gambar JPG, PNG, WebP, AVIF, atau berkas PDF." : "Gunakan gambar JPG, PNG, WebP, atau AVIF.", 400);
  if (file.size > maxFileSize) return fail(isPdf ? "Ukuran PDF maksimal 4 MB." : "Ukuran gambar maksimal 4 MB.", 400);

  const stored = await storeUpload({ body: await file.arrayBuffer(), filename: file.name, mimeType: file.type, extension });
  if (!stored.ok) return fail(stored.error, stored.status);
  return NextResponse.json({ id: stored.id, url: stored.url });
}

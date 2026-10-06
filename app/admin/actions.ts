"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, credentialsConfigured, credentialsMatch, destroySession, getAdmin } from "@/lib/auth";
import { getEntityDef } from "@/lib/cms/entities";
import { getPageDef } from "@/lib/cms/pages";
import { deleteRecord, saveContent, saveCustomerPhotos, saveRecord, type SaveResult } from "@/lib/cms/store";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { deleteR2Object } from "@/lib/storage";

export type FormState = { error?: string };

const expired: SaveResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };

/** Halaman publik dibuat statis; setiap perubahan dari dashboard menyegarkan semuanya. */
function refreshSite() {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!credentialsConfigured()) {
    return { error: "Akun admin belum diatur. Isi ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 8 karakter) di environment." };
  }
  if (!credentialsMatch(email, password)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Email atau kata sandi salah." };
  }
  await createSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function saveContentAction(key: string, data: unknown): Promise<SaveResult> {
  if (!(await getAdmin())) return expired;
  const page = getPageDef(key);
  if (!page) return { ok: false, message: "Halaman tidak dikenal." };
  const result = await saveContent(page, data);
  if (result.ok) refreshSite();
  return result;
}

export async function saveRecordAction(entityKey: string, data: unknown): Promise<SaveResult> {
  if (!(await getAdmin())) return expired;
  const entity = getEntityDef(entityKey);
  if (!entity) return { ok: false, message: "Jenis data tidak dikenal." };
  const result = await saveRecord(entity, data);
  if (result.ok && !entity.internal) refreshSite();
  return result;
}

export async function deleteRecordAction(entityKey: string, id: string): Promise<SaveResult> {
  if (!(await getAdmin())) return expired;
  const entity = getEntityDef(entityKey);
  if (!entity) return { ok: false, message: "Jenis data tidak dikenal." };
  const result = await deleteRecord(entity, id);
  if (result.ok && !entity.internal) refreshSite();
  return result;
}

export async function saveCustomerPhotosAction(id: string, photos: string[]): Promise<SaveResult> {
  if (!(await getAdmin())) return expired;
  return saveCustomerPhotos(id, photos);
}

export type MediaItem = { id: string; url: string; filename: string; size: number; createdAt: Date };

export async function listMediaAction(): Promise<MediaItem[]> {
  if (!(await getAdmin()) || !db) return [];
  return db
    .select({ id: mediaAssets.id, url: mediaAssets.url, filename: mediaAssets.filename, size: mediaAssets.size, createdAt: mediaAssets.createdAt })
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt));
}

export async function deleteMediaAction(id: string): Promise<SaveResult> {
  if (!(await getAdmin())) return expired;
  if (!db) return { ok: false, message: "Database belum diatur." };
  const [asset] = await db.select({ url: mediaAssets.url }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset) return { ok: false, message: "Media tidak ditemukan." };
  try {
    await deleteR2Object(asset.url);
  } catch {
    return { ok: false, message: "Media tidak dapat dihapus dari penyimpanan. Coba lagi." };
  }
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return { ok: true, message: "Media dihapus." };
}

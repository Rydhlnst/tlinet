"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, getAdmin } from "@/lib/auth";
import { getEntityDef } from "@/lib/cms/entities";
import { getPageDef } from "@/lib/cms/pages";
import { deleteRecord, saveContent, saveRecord, type SaveResult } from "@/lib/cms/store";
import { db } from "@/lib/db";
import { adminUsers, mediaAssets } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { deleteR2Object } from "@/lib/storage";

export type FormState = { error?: string; success?: string };

const expired: SaveResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };

/** Halaman publik dibuat statis; setiap perubahan dari dashboard menyegarkan semuanya. */
function refreshSite() {
  revalidatePath("/", "layout");
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!db) return { error: "Database belum diatur. Isi DATABASE_URL lalu jalankan npm run db:seed." };
  if (!email || !password) return { error: "Email dan kata sandi wajib diisi." };

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Email atau kata sandi salah." };
  }
  await createSession(user.id);
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
  if (result.ok) refreshSite();
  return result;
}

export async function deleteRecordAction(entityKey: string, id: string): Promise<SaveResult> {
  if (!(await getAdmin())) return expired;
  const entity = getEntityDef(entityKey);
  if (!entity) return { ok: false, message: "Jenis data tidak dikenal." };
  const result = await deleteRecord(entity, id);
  if (result.ok) refreshSite();
  return result;
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

export async function changePasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdmin();
  if (!admin || !db) return { error: expired.message };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "Kata sandi baru minimal 8 karakter." };
  if (next !== confirm) return { error: "Konfirmasi kata sandi tidak sama." };

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id)).limit(1);
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { error: "Kata sandi saat ini salah." };
  await db.update(adminUsers).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(adminUsers.id, admin.id));
  return { success: "Kata sandi diperbarui." };
}

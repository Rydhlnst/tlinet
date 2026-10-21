"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accurateMode, accurateWriteEnabled, searchAccurate } from "@/lib/accurate";
import { getAccurateForm, type LookupKind, type LookupOption } from "@/lib/accurate-forms";
import { importAccurateCustomers } from "@/lib/accurate-import";
import { saveAccurateForm } from "@/lib/accurate-save";
import { eq as equals } from "drizzle-orm";
import { createSession, credentialsConfigured, credentialsMatch, destroySession, findStaffLogin, getAdmin, getAdminWith } from "@/lib/auth";
import { getEntityDef } from "@/lib/cms/entities";
import { getPageDef } from "@/lib/cms/pages";
import { deleteRecord, generateNextMonth, saveContent, saveCustomerPhotos, saveRecord, setCustomerProfilePhoto, setDataCenterPhoto, type SaveResult } from "@/lib/cms/store";
import { db } from "@/lib/db";
import { customerPayments, customerPurchases, customers, dataCenterPayments, invoices, mediaAssets, salaryPayments, staffUsers } from "@/lib/db/schema";
import { mrtgSourceOptions } from "@/lib/data-centers";
import { syncInvoicePayment, syncPaymentInvoice } from "@/lib/invoice-payments";
import { can, entityPermission, homePath, isStaffPermission, pagePermission } from "@/lib/permissions";
import { moveToTrash, snapshotRows } from "@/lib/trash";

export type FormState = { error?: string };

const expired: SaveResult = { ok: false, message: "Sesi berakhir atau Anda tidak punya akses ke menu ini." };

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
  if (credentialsMatch(email, password)) {
    await createSession();
    redirect("/admin");
  }
  // Bukan owner: coba akun staf dari menu Pengguna.
  const staff = await findStaffLogin(email, password);
  if (!staff) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Email atau kata sandi salah." };
  }
  const permissions = staff.permissions.filter(isStaffPermission);
  if (!staff.active) return { error: "Akun Anda sedang dinonaktifkan. Hubungi owner dashboard." };
  if (!permissions.length) return { error: "Akun Anda belum diberi hak akses ke menu mana pun." };
  await db?.update(staffUsers).set({ lastLoginAt: new Date() }).where(equals(staffUsers.id, staff.id));
  await createSession({ email: staff.email, passwordHash: staff.passwordHash });
  redirect(homePath({ email: staff.email, name: staff.name, role: "staff", permissions }));
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function saveContentAction(key: string, data: unknown): Promise<SaveResult> {
  if (!(await getAdminWith(pagePermission(key)))) return expired;
  const page = getPageDef(key);
  if (!page) return { ok: false, message: "Halaman tidak dikenal." };
  const result = await saveContent(page, data);
  if (result.ok) refreshSite();
  return result;
}

export async function saveRecordAction(entityKey: string, data: unknown): Promise<SaveResult> {
  const admin = await getAdminWith(entityPermission(entityKey));
  if (!admin) return expired;
  const entity = getEntityDef(entityKey);
  if (!entity) return { ok: false, message: "Jenis data tidak dikenal." };
  // Staf tanpa hak Keuangan tidak melihat biaya ke NAP di form; nilai lamanya dipertahankan.
  if (entity.key === "customers" && !can(admin, "finance") && data && typeof data === "object") {
    const id = (data as { id?: unknown }).id;
    const [existing] = typeof id === "string" && db ? await db.select({ napFee: customers.napFee }).from(customers).where(equals(customers.id, id)).limit(1) : [];
    data = { ...(data as Record<string, unknown>), napFee: existing?.napFee ?? "" };
  }
  const result = await saveRecord(entity, data);
  if (result.ok && !entity.internal) refreshSite();
  return result;
}

export async function generateNextMonthAction(entityKey: string, source: string, customerId = ""): Promise<SaveResult> {
  if (!(await getAdminWith(entityPermission(entityKey)))) return expired;
  const entity = getEntityDef(entityKey);
  if (!entity?.monthly) return { ok: false, message: "Jenis data tidak dikenal." };
  return generateNextMonth(entity, source, customerId);
}

export async function deleteRecordAction(entityKey: string, id: string): Promise<SaveResult> {
  const admin = await getAdminWith(entityPermission(entityKey));
  if (!admin) return expired;
  const entity = getEntityDef(entityKey);
  if (!entity) return { ok: false, message: "Jenis data tidak dikenal." };
  const result = await deleteRecord(entity, id, admin.name || admin.email);
  if (result.ok && !entity.internal) refreshSite();
  return result;
}

export async function importAccurateCustomersAction(): Promise<SaveResult> {
  if (!(await getAdminWith("accurate"))) return expired;
  if (accurateMode !== "ready") return { ok: false, message: "Accurate belum dihubungkan." };
  try {
    return await importAccurateCustomers();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Impor dari Accurate gagal." };
  }
}

/** Pilihan untuk field pencarian di form Accurate; kosong bila sesi habis atau Accurate gagal dijangkau. */
export async function searchAccurateAction(kind: LookupKind, keywords: string, scope: string): Promise<LookupOption[]> {
  if (!(await getAdminWith("accurate")) || accurateMode !== "ready") return [];
  return searchAccurate(kind, String(keywords).trim().slice(0, 80), String(scope).slice(0, 80)).catch(() => []);
}

export async function saveAccurateAction(path: string, data: unknown): Promise<SaveResult> {
  if (!(await getAdminWith("accurate"))) return expired;
  const form = getAccurateForm(path);
  if (!form) return { ok: false, message: "Form tidak dikenal." };
  if (!accurateWriteEnabled) return { ok: false, message: "Form input ke Accurate belum diaktifkan." };
  return saveAccurateForm(form, data);
}

export async function setInvoiceStatusAction(id: string, status: "paid" | "unpaid"): Promise<SaveResult> {
  if (!(await getAdminWith("billing"))) return expired;
  if (!db) return { ok: false, message: "Database belum diatur." };
  if (status !== "paid" && status !== "unpaid") return { ok: false, message: "Status tidak valid." };
  const updated = await db.update(invoices).set({ status, updatedAt: new Date() }).where(eq(invoices.id, id)).returning({ id: invoices.id });
  if (!updated.length) return { ok: false, message: "Invoice tidak ditemukan." };
  await syncInvoicePayment(id);
  return { ok: true, message: status === "paid" ? "Invoice ditandai Paid; History Pembayaran ikut Lunas." : "Invoice ditandai Unpaid; History Pembayaran ikut Belum lunas." };
}

/** Tanggal hari ini di WITA, untuk tanggal bayar yang belum diisi saat ditandai lunas. */
const todayWita = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

const statusTables = { "customer-payments": customerPayments, "customer-purchases": customerPurchases, salaries: salaryPayments, "data-center-payments": dataCenterPayments } as const;

/**
 * Tandai lunas / belum lunas dengan satu klik dari daftar. Invoice ikut memperbarui History Pembayaran Subnet, dan
 * sebaliknya; tanggal bayar yang kosong diisi hari ini saat ditandai lunas.
 */
export async function setRecordStatusAction(entityKey: string, id: string, status: "paid" | "unpaid"): Promise<SaveResult> {
  if (status !== "paid" && status !== "unpaid") return { ok: false, message: "Status tidak valid." };
  if (entityKey === "invoices") return setInvoiceStatusAction(id, status);
  if (!(entityKey in statusTables)) return { ok: false, message: "Data ini tidak punya status pembayaran." };
  if (!(await getAdminWith(entityPermission(entityKey)))) return expired;
  if (!db) return { ok: false, message: "Database belum diatur." };
  const table = statusTables[entityKey as keyof typeof statusTables];
  const [row] = await db.select({ paidDate: table.paidDate }).from(table).where(equals(table.id, id)).limit(1);
  if (!row) return { ok: false, message: "Data tidak ditemukan." };
  await db
    .update(table)
    .set({ status, paidDate: status === "paid" ? row.paidDate || todayWita() : row.paidDate, updatedAt: new Date() })
    .where(equals(table.id, id));
  if (entityKey === "customer-payments") await syncPaymentInvoice(id);
  const label = entityKey === "salaries" ? (status === "paid" ? "Sudah dibayar" : "Belum dibayar") : status === "paid" ? "Lunas" : "Belum lunas";
  return { ok: true, message: `Ditandai ${label}${entityKey === "customer-payments" ? "; invoicenya ikut diperbarui" : ""}.` };
}

/** Pilihan Grafik MRTG Data Center dari LibreNMS; dimuat saat form dibuka supaya halamannya tidak menunggu LibreNMS. */
export async function mrtgSourceOptionsAction(): Promise<{ value: string; label: string }[]> {
  if (!(await getAdminWith("finance"))) return [];
  return mrtgSourceOptions();
}

export async function saveCustomerPhotosAction(id: string, photos: string[]): Promise<SaveResult> {
  if (!(await getAdminWith("customers"))) return expired;
  return saveCustomerPhotos(id, photos);
}

/** Ganti foto profil dari halaman detail (ikon edit di foto): `kind` menentukan datanya dan hak akses yang dibutuhkan. */
export async function setProfilePhotoAction(kind: "customers" | "data-centers", id: string, url: string): Promise<SaveResult> {
  if (kind === "customers") {
    if (!(await getAdminWith("customers"))) return expired;
    return setCustomerProfilePhoto(id, url);
  }
  if (kind === "data-centers") {
    if (!(await getAdminWith("finance"))) return expired;
    return setDataCenterPhoto(id, url);
  }
  return { ok: false, message: "Data ini tidak punya foto profil." };
}

export type MediaItem = { id: string; url: string; filename: string; mimeType: string; size: number; createdAt: Date };

export async function listMediaAction(): Promise<MediaItem[]> {
  if (!(await getAdmin()) || !db) return [];
  return db
    .select({ id: mediaAssets.id, url: mediaAssets.url, filename: mediaAssets.filename, mimeType: mediaAssets.mimeType, size: mediaAssets.size, createdAt: mediaAssets.createdAt })
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt));
}

export async function deleteMediaAction(id: string): Promise<SaveResult> {
  const admin = await getAdminWith("content");
  if (!admin) return expired;
  if (!db) return { ok: false, message: "Database belum diatur." };
  const saved = await snapshotRows("mediaAssets", eq(mediaAssets.id, id));
  const asset = saved.rows[0] as { url?: string; filename?: string } | undefined;
  if (!asset) return { ok: false, message: "Media tidak ditemukan." };
  // Berkas di R2 tetap disimpan selama di Tempat Sampah; baru dibuang saat sampah dikosongkan.
  await moveToTrash({ kind: "media", label: "Media", title: asset.filename || "Gambar", permission: "content", deletedBy: admin.name || admin.email, tables: [saved], files: [asset.url ?? ""] });
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return { ok: true, message: "Media dipindahkan ke Tempat Sampah." };
}

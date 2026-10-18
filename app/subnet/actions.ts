"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDb } from "@/lib/db";
import { customers, subnetAccounts } from "@/lib/db/schema";
import { createSubnetSession, destroySubnetSession, getSubnetUser, subnetPasswordMatches } from "@/lib/subnet";
import { storeUpload } from "@/lib/uploads";

export type SubnetResult = { ok: true; message: string } | { ok: false; message: string };

const expired: SubnetResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };

/** Foto sudah diperkecil di perangkat pelanggan sebelum dikirim, jadi batasnya kecil. */
const photoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxPhotoSize = 900 * 1024;

/**
 * Mengganti foto profil pelanggan. Foto baru dipasang sebagai foto pertama di Data Pelanggan (yang tampil sebagai
 * foto profil di admin) dan menggantikan foto profil sebelumnya dari portal; foto lain dari admin tidak disentuh.
 */
export async function updateSubnetPhotoAction(formData: FormData): Promise<SubnetResult> {
  const user = await getSubnetUser();
  if (!user) return expired;
  const file = formData.get("photo");
  if (!(file instanceof File)) return { ok: false, message: "Pilih foto terlebih dahulu." };
  const extension = photoTypes.get(file.type);
  if (!extension) return { ok: false, message: "Gunakan foto JPG, PNG, atau WebP." };
  if (file.size > maxPhotoSize) return { ok: false, message: "Ukuran foto terlalu besar." };

  const stored = await storeUpload({ body: await file.arrayBuffer(), filename: file.name || `profil.${extension}`, mimeType: file.type, extension });
  if (!stored.ok) return { ok: false, message: stored.error };

  const db = requireDb();
  const [customer] = await db.select({ photos: customers.photos }).from(customers).where(eq(customers.id, user.customerId)).limit(1);
  const photos = [stored.url, ...(customer?.photos ?? []).filter((url) => url !== user.photoUrl)];
  await db.update(customers).set({ photos, updatedAt: new Date() }).where(eq(customers.id, user.customerId));
  await db.update(subnetAccounts).set({ photoUrl: stored.url, updatedAt: new Date() }).where(eq(subnetAccounts.customerId, user.customerId));
  revalidatePath("/subnet", "layout");
  return { ok: true, message: "Foto profil diperbarui." };
}

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

/** Mengganti alamat pelanggan di Data Pelanggan: alamat lengkap, kecamatan, kabupaten, dan provinsi. */
export async function updateSubnetAddressAction(input: { address: string; district: string; regency: string; province: string }): Promise<SubnetResult> {
  const user = await getSubnetUser();
  if (!user) return expired;
  const values = { address: clean(input.address, 500), district: clean(input.district, 100), regency: clean(input.regency, 100), province: clean(input.province, 100) };
  if (!values.address) return { ok: false, message: "Alamat lengkap wajib diisi." };
  await requireDb()
    .update(customers)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(customers.id, user.customerId));
  revalidatePath("/subnet", "layout");
  return { ok: true, message: "Alamat diperbarui." };
}

export type SubnetFormState = { error?: string };

const slowDown = () => new Promise((resolve) => setTimeout(resolve, 600));

export async function subnetLoginAction(_previous: SubnetFormState, formData: FormData): Promise<SubnetFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const db = requireDb();
  const [account] = email ? await db.select().from(subnetAccounts).where(eq(subnetAccounts.email, email)).limit(1) : [];
  if (!account || !(await subnetPasswordMatches(password, account.passwordHash))) {
    await slowDown();
    return { error: "Email atau kata sandi salah." };
  }
  if (!account.active) return { error: "Akses Anda sedang dinonaktifkan. Silakan hubungi admin TLINET." };

  await db.update(subnetAccounts).set({ lastLoginAt: new Date() }).where(eq(subnetAccounts.customerId, account.customerId));
  await createSubnetSession(account.customerId, account.passwordHash);
  redirect("/subnet");
}

export async function subnetLogoutAction() {
  await destroySubnetSession();
  redirect("/subnet/login");
}

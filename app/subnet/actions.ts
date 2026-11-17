"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireDb } from "@/lib/db";
import { customerPayments, customers, invoices, metroOrders, subnetAccounts } from "@/lib/db/schema";
import { capacityLabel, upgradeOptions } from "@/lib/metro";
import { androidAppMarker, createSubnetSession, destroySubnetSession, getSubnetUser, subnetPasswordMatches } from "@/lib/subnet";
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

/** Pelanggan mengajukan upgrade kapasitas; masuk ke menu Progres Metro di admin untuk disetujui tim IT. */
export async function requestUpgradeAction(input: { mbps: number; note: string }): Promise<SubnetResult> {
  const user = await getSubnetUser();
  if (!user) return expired;
  const db = requireDb();
  const [customer] = await db.select({ name: customers.name, capacity: customers.capacity }).from(customers).where(eq(customers.id, user.customerId)).limit(1);
  if (!customer) return expired;
  const mbps = Number(input.mbps);
  if (!upgradeOptions(customer.capacity).includes(mbps)) return { ok: false, message: "Pilih kapasitas upgrade." };
  const [open] = await db
    .select({ id: metroOrders.id })
    .from(metroOrders)
    .where(and(eq(metroOrders.customerId, user.customerId), eq(metroOrders.kind, "upgrade"), eq(metroOrders.status, "active")))
    .limit(1);
  if (open) return { ok: false, message: "Masih ada permintaan upgrade yang sedang diproses." };

  await db.insert(metroOrders).values({
    id: crypto.randomUUID(),
    customerId: user.customerId,
    kind: "upgrade",
    capacity: capacityLabel(mbps),
    previousCapacity: customer.capacity,
    note: clean(input.note, 300),
    steps: { permintaan: { at: new Date().toISOString(), by: customer.name } },
  });
  revalidatePath("/subnet", "layout");
  revalidatePath("/admin/metro");
  return { ok: true, message: "Permintaan upgrade terkirim. Pantau prosesnya di halaman ini." };
}

const proofTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);
const maxProofSize = 4 * 1024 * 1024;

/**
 * Pelanggan mengunggah bukti transfer untuk sebuah invoice yang belum lunas, beserta keterangan opsional. Bukti langsung
 * menempel di History Pembayaran Subnet invoice itu dan diberi penanda waktu agar admin mendapat notifikasi untuk
 * memverifikasi (menandai lunas).
 */
export async function uploadPaymentProofAction(formData: FormData): Promise<SubnetResult> {
  const user = await getSubnetUser();
  if (!user) return expired;
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const note = clean(formData.get("note"), 500);
  const file = formData.get("proof");
  if (!(file instanceof File)) return { ok: false, message: "Pilih berkas bukti transfer." };
  const extension = proofTypes.get(file.type);
  if (!extension) return { ok: false, message: "Gunakan foto (JPG, PNG, WebP) atau PDF." };
  if (file.size > maxProofSize) return { ok: false, message: "Ukuran berkas maksimal 4 MB." };

  const db = requireDb();
  const [invoice] = await db
    .select({ id: invoices.id, number: invoices.number, total: invoices.total, issueDate: invoices.issueDate, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.customerId, user.customerId)))
    .limit(1);
  if (!invoice) return { ok: false, message: "Invoice tidak ditemukan." };
  if (invoice.status === "paid") return { ok: false, message: "Invoice ini sudah lunas." };

  const stored = await storeUpload({ body: await file.arrayBuffer(), filename: file.name || `bukti.${extension}`, mimeType: file.type, extension });
  if (!stored.ok) return { ok: false, message: stored.error };

  const [payment] = await db.select({ id: customerPayments.id }).from(customerPayments).where(eq(customerPayments.invoiceId, invoiceId)).limit(1);
  if (payment) {
    await db
      .update(customerPayments)
      .set({ proofUrl: stored.url, proofAt: new Date(), updatedAt: new Date(), ...(note ? { note } : {}) })
      .where(eq(customerPayments.id, payment.id));
  } else {
    const [owner] = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, user.customerId)).limit(1);
    await db.insert(customerPayments).values({
      id: crypto.randomUUID(),
      customerId: user.customerId,
      invoiceId,
      period: invoice.issueDate.slice(0, 7),
      amount: invoice.total,
      status: "unpaid",
      method: "Transfer",
      pic: owner?.name ?? "",
      proofUrl: stored.url,
      note: note || `Invoice ${invoice.number}`,
      proofAt: new Date(),
    });
  }
  revalidatePath("/subnet/tagihan");
  revalidatePath("/subnet");
  return { ok: true, message: "Bukti transfer terkirim. Menunggu verifikasi admin." };
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

  // Catat perangkat login untuk menu Subnet; tandai "sudah instal aplikasi" saat login pertama dari aplikasi Android.
  const ua = (await headers()).get("user-agent") ?? "";
  const inApp = ua.includes(androidAppMarker);
  await db
    .update(subnetAccounts)
    .set({ lastLoginAt: new Date(), lastDevice: ua.slice(0, 400), ...(inApp && !account.appInstalledAt ? { appInstalledAt: new Date() } : {}) })
    .where(eq(subnetAccounts.customerId, account.customerId));
  await createSubnetSession(account.customerId, account.passwordHash);
  redirect("/subnet");
}

export async function subnetLogoutAction() {
  await destroySubnetSession();
  redirect("/subnet/login");
}

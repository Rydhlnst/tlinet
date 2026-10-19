"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminWith } from "@/lib/auth";
import type { SaveResult } from "@/lib/cms/store";
import { requireDb } from "@/lib/db";
import { customers, subnetAccounts } from "@/lib/db/schema";
import { hashSubnetPassword, minSubnetPasswordLength, pingTargetPattern, subnetEmailPattern } from "@/lib/subnet";

const expired: SaveResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };

/**
 * Membuat atau mengubah akses portal Subnet satu pelanggan. Kata sandi wajib saat akses baru dibuat;
 * saat mengubah, kata sandi kosong berarti tetap memakai yang lama.
 */
export async function saveSubnetAccessAction(customerId: string, input: { email: string; password: string; active: boolean; source: { portId: number } | { qosDeviceId: number; qosId: number } | null; pingTarget: string }): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  const db = requireDb();
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");

  const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) return { ok: false, message: "Pelanggan tidak ditemukan." };
  if (email.length > 200 || !subnetEmailPattern.test(email)) return { ok: false, message: "Isi alamat email yang valid." };
  const [taken] = await db
    .select({ id: subnetAccounts.customerId })
    .from(subnetAccounts)
    .where(and(eq(subnetAccounts.email, email), ne(subnetAccounts.customerId, customerId)))
    .limit(1);
  if (taken) return { ok: false, message: "Email ini sudah dipakai pelanggan lain." };

  const [existing] = await db.select({ id: subnetAccounts.customerId }).from(subnetAccounts).where(eq(subnetAccounts.customerId, customerId)).limit(1);
  if (!existing && !password) return { ok: false, message: "Isi kata sandi untuk akses baru." };
  if (password && password.length < minSubnetPasswordLength) return { ok: false, message: `Kata sandi minimal ${minSubnetPasswordLength} karakter.` };

  const pingTarget = String(input.pingTarget ?? "").trim();
  if (pingTarget && !pingTargetPattern.test(pingTarget)) return { ok: false, message: "IP untuk ping.pe tidak valid. Isi satu alamat IP atau hostname, tanpa spasi atau garis miring." };

  const positive = (value: unknown) => (Number.isInteger(value) && Number(value) > 0 ? Number(value) : null);
  const source = input.source;
  const portId = source && "portId" in source ? positive(source.portId) : null;
  const qosId = source && "qosId" in source ? positive(source.qosId) : null;
  const qosDeviceId = qosId && source && "qosDeviceId" in source ? positive(source.qosDeviceId) : null;
  const values = { email, active: Boolean(input.active), librenmsPortId: portId, librenmsQosId: qosDeviceId ? qosId : null, librenmsQosDeviceId: qosDeviceId, pingTarget, updatedAt: new Date(), ...(password ? { passwordHash: await hashSubnetPassword(password) } : {}) };
  if (existing) {
    await db.update(subnetAccounts).set(values).where(eq(subnetAccounts.customerId, customerId));
  } else {
    await db.insert(subnetAccounts).values({ ...values, customerId, passwordHash: values.passwordHash! });
  }
  revalidatePath("/admin/subnet");
  return { ok: true, message: existing ? "Akses Subnet diperbarui." : "Akses Subnet dibuat." };
}

/** Menghapus akses portal pelanggan; sesi yang sedang berjalan ikut berakhir. */
export async function deleteSubnetAccessAction(customerId: string): Promise<SaveResult> {
  if (!(await getAdminWith("subnet"))) return expired;
  await requireDb().delete(subnetAccounts).where(eq(subnetAccounts.customerId, customerId));
  revalidatePath("/admin/subnet");
  return { ok: true, message: "Akses Subnet dihapus." };
}

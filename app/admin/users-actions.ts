"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminWith } from "@/lib/auth";
import type { SaveResult } from "@/lib/cms/store";
import { requireDb } from "@/lib/db";
import { moveToTrash, snapshotRows } from "@/lib/trash";
import { staffUsers } from "@/lib/db/schema";
import { hashPassword } from "@/lib/passwords";
import { isStaffPermission } from "@/lib/permissions";

const forbidden: SaveResult = { ok: false, message: "Hanya owner dashboard yang bisa mengelola pengguna." };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minPasswordLength = 8;

export type StaffUserInput = { email: string; name: string; password: string; permissions: string[]; active: boolean };

/** Membuat atau mengubah akun staf. Kata sandi wajib untuk akun baru; saat mengubah, kosong berarti tetap. */
export async function saveStaffUserAction(id: string | null, input: StaffUserInput): Promise<SaveResult> {
  if (!(await getAdminWith("users"))) return forbidden;
  const db = requireDb();
  const email = String(input.email ?? "").trim().toLowerCase();
  const name = String(input.name ?? "").trim().slice(0, 100);
  const password = String(input.password ?? "");
  const permissions = [...new Set((Array.isArray(input.permissions) ? input.permissions : []).filter(isStaffPermission))];

  if (email.length > 200 || !emailPattern.test(email)) return { ok: false, message: "Isi alamat email yang valid." };
  if (email === (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()) return { ok: false, message: "Email ini dipakai akun owner." };
  if (!permissions.length) return { ok: false, message: "Pilih minimal satu hak akses." };
  if (!id && !password) return { ok: false, message: "Isi kata sandi untuk akun baru." };
  if (password && password.length < minPasswordLength) return { ok: false, message: `Kata sandi minimal ${minPasswordLength} karakter.` };

  const [taken] = await db
    .select({ id: staffUsers.id })
    .from(staffUsers)
    .where(id ? and(eq(staffUsers.email, email), ne(staffUsers.id, id)) : eq(staffUsers.email, email))
    .limit(1);
  if (taken) return { ok: false, message: "Email ini sudah dipakai pengguna lain." };

  const values = { email, name, permissions, active: Boolean(input.active), updatedAt: new Date(), ...(password ? { passwordHash: await hashPassword(password) } : {}) };
  if (id) {
    const updated = await db.update(staffUsers).set(values).where(eq(staffUsers.id, id)).returning({ id: staffUsers.id });
    if (!updated.length) return { ok: false, message: "Pengguna tidak ditemukan." };
  } else {
    await db.insert(staffUsers).values({ ...values, id: crypto.randomUUID(), passwordHash: values.passwordHash! });
  }
  revalidatePath("/admin/users");
  return { ok: true, message: id ? "Pengguna diperbarui." : "Pengguna dibuat." };
}

/** Menghapus akun staf; sesi yang sedang berjalan ikut berakhir. */
export async function deleteStaffUserAction(id: string): Promise<SaveResult> {
  const admin = await getAdminWith("users");
  if (!admin) return forbidden;
  const saved = await snapshotRows("staffUsers", eq(staffUsers.id, id));
  const user = saved.rows[0] as { name?: string; email?: string } | undefined;
  if (!user) return { ok: false, message: "Pengguna tidak ditemukan." };
  await moveToTrash({ kind: "staff", label: "Akun staf", title: user.name ? `${user.name} · ${user.email}` : String(user.email ?? ""), permission: "users", deletedBy: admin.name || admin.email, tables: [saved] });
  await requireDb().delete(staffUsers).where(eq(staffUsers.id, id));
  revalidatePath("/admin/users");
  return { ok: true, message: "Pengguna dihapus." };
}

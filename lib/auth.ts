import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireDb } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema";
import { passwordMatches } from "@/lib/passwords";
import { can, homePath, isStaffPermission, type AdminUser, type Permission } from "@/lib/permissions";

export const sessionCookie = "tl_admin";
const maxAgeSeconds = 60 * 60 * 12;
const minPasswordLength = 8;

/** Akun admin diatur lewat environment: ADMIN_EMAIL dan ADMIN_PASSWORD. */
const adminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const adminPassword = () => process.env.ADMIN_PASSWORD ?? "";

export const credentialsConfigured = () => Boolean(adminEmail()) && adminPassword().length >= minPasswordLength;

export function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET belum diatur.");
  return "development-only-session-secret";
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Perbandingan waktu-konstan; kedua nilai di-hash dulu agar panjangnya sama. */
export function credentialsMatch(email: string, password: string) {
  if (!credentialsConfigured()) return false;
  const emailOk = timingSafeEqual(digest(email.trim().toLowerCase()), digest(adminEmail()));
  const passwordOk = timingSafeEqual(digest(password), digest(adminPassword()));
  return emailOk && passwordOk;
}

// Kata sandi ikut menjadi kunci tanda tangan, sehingga menggantinya di env mengakhiri semua sesi lama.
const sign = (payload: string) => createHmac("sha256", `${secret()}:${adminPassword()}`).update(payload).digest("base64url");

/**
 * Kode rahasia tautan publik, mis. invoice yang dibagikan ke pelanggan. Tidak bisa ditebak tanpa SESSION_SECRET dan,
 * berbeda dengan sesi, tetap berlaku walau kata sandi admin diganti.
 */
export const linkCode = (value: string) => createHmac("sha256", secret()).update(`link:${value}`).digest("base64url").slice(0, 22);

export const linkCodeMatches = (value: string, code: string) => timingSafeEqual(digest(code), digest(linkCode(value)));

type Session = { payload: string; signature: string; email: string; staff: boolean };

/** Isi cookie sesi tanpa memeriksa tanda tangannya; kuncinya bergantung pada jenis akun. */
function parseSession(value: string | undefined): Session | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown; exp?: unknown; staff?: unknown };
    if (typeof parsed.email !== "string" || typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return { payload, signature, email: parsed.email, staff: parsed.staff === 1 };
  } catch {
    return null;
  }
}

const signatureMatches = (session: Session, key: string) => {
  const expected = createHmac("sha256", key).update(session.payload).digest("base64url");
  return session.signature.length === expected.length && timingSafeEqual(Buffer.from(session.signature), Buffer.from(expected));
};

/** Hash kata sandi staf ikut menjadi kunci tanda tangan: mengganti kata sandinya mengakhiri sesi lama akun itu. */
const staffKey = (passwordHash: string) => `${secret()}:staff:${passwordHash}`;

/** Membuat sesi owner, atau sesi staf bila `staff` diisi. */
export async function createSession(staff?: { email: string; passwordHash: string }) {
  const payload = Buffer.from(JSON.stringify({ email: staff?.email ?? adminEmail(), exp: Date.now() + maxAgeSeconds * 1000, ...(staff ? { staff: 1 } : {}) })).toString("base64url");
  const signature = staff ? createHmac("sha256", staffKey(staff.passwordHash)).update(payload).digest("base64url") : sign(payload);
  (await cookies()).set(sessionCookie, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function destroySession() {
  (await cookies()).delete(sessionCookie);
}

export type { AdminUser } from "@/lib/permissions";

/**
 * Pengguna dashboard yang sedang masuk, atau `null`. Sesi owner gugur bila ADMIN_EMAIL atau ADMIN_PASSWORD diganti;
 * sesi staf gugur bila akunnya dinonaktifkan, dihapus, kata sandinya diganti, atau tidak punya hak akses sama sekali.
 */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const session = parseSession((await cookies()).get(sessionCookie)?.value);
  if (!session) return null;
  if (!session.staff) {
    if (!credentialsConfigured() || session.email !== adminEmail() || !signatureMatches(session, `${secret()}:${adminPassword()}`)) return null;
    return { email: session.email, name: "Administrator", role: "owner", permissions: [] };
  }
  const [user] = await requireDb().select().from(staffUsers).where(eq(staffUsers.email, session.email)).limit(1);
  if (!user?.active || !signatureMatches(session, staffKey(user.passwordHash))) return null;
  const permissions = user.permissions.filter(isStaffPermission);
  return permissions.length ? { email: user.email, name: user.name || user.email, role: "staff", permissions } : null;
});

/** Pengguna yang sedang masuk bila boleh `permission`; untuk server action dan API. */
export async function getAdminWith(permission: Permission) {
  const admin = await getAdmin();
  return admin && can(admin, permission) ? admin : null;
}

/** Penjaga halaman: belum masuk ke halaman masuk; tanpa hak akses ke halaman pertama yang boleh dibuka. */
export async function requireAdmin(permission?: Permission) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !can(admin, permission)) redirect(homePath(admin));
  return admin;
}

/** Akun staf yang cocok dengan email dan kata sandi ini, untuk halaman masuk. */
export async function findStaffLogin(email: string, password: string) {
  const [user] = await requireDb().select().from(staffUsers).where(eq(staffUsers.email, email.trim().toLowerCase())).limit(1);
  if (!user || !(await passwordMatches(password, user.passwordHash))) return null;
  return user;
}

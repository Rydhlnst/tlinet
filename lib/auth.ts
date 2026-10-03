import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const sessionCookie = "tl_admin";
const maxAgeSeconds = 60 * 60 * 12;
const minPasswordLength = 8;

/** Akun admin diatur lewat environment: ADMIN_EMAIL dan ADMIN_PASSWORD. */
const adminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const adminPassword = () => process.env.ADMIN_PASSWORD ?? "";

export const credentialsConfigured = () => Boolean(adminEmail()) && adminPassword().length >= minPasswordLength;

function secret() {
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

function readSession(value: string | undefined) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; exp?: number };
    return typeof parsed.email === "string" && typeof parsed.exp === "number" && parsed.exp > Date.now() ? parsed.email : null;
  } catch {
    return null;
  }
}

export async function createSession() {
  const payload = Buffer.from(JSON.stringify({ email: adminEmail(), exp: Date.now() + maxAgeSeconds * 1000 })).toString("base64url");
  (await cookies()).set(sessionCookie, `${payload}.${sign(payload)}`, {
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

export type AdminUser = { email: string; name: string };

/** Admin yang sedang masuk, atau `null`. Sesi gugur bila ADMIN_EMAIL atau ADMIN_PASSWORD diganti. */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  if (!credentialsConfigured()) return null;
  const email = readSession((await cookies()).get(sessionCookie)?.value);
  return email && email === adminEmail() ? { email, name: "Administrator" } : null;
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual, type BinaryLike } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { secret } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { customers, subnetAccounts } from "@/lib/db/schema";

/** Portal Subnet: pelanggan masuk dengan email dan kata sandi yang dibuat admin, lalu melihat data dan invoicenya sendiri. */

const sessionCookie = "tl_subnet";
const maxAgeSeconds = 60 * 60 * 24 * 30;
export const minSubnetPasswordLength = 8;
export const subnetEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const scrypt = (password: BinaryLike, salt: BinaryLike) =>
  new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, 32, (error, key) => (error ? reject(error) : resolve(key))));

export async function hashSubnetPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${(await scrypt(password, salt)).toString("base64url")}`;
}

export async function subnetPasswordMatches(password: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash kata sandi ikut menjadi kunci tanda tangan, sehingga mengganti kata sandi mengakhiri sesi lama pelanggan itu. */
const sign = (payload: string, passwordHash: string) => createHmac("sha256", `${secret()}:subnet:${passwordHash}`).update(payload).digest("base64url");

export async function createSubnetSession(customerId: string, passwordHash: string) {
  const payload = Buffer.from(JSON.stringify({ id: customerId, exp: Date.now() + maxAgeSeconds * 1000 })).toString("base64url");
  (await cookies()).set(sessionCookie, `${payload}.${sign(payload, passwordHash)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function destroySubnetSession() {
  (await cookies()).delete(sessionCookie);
}

export type SubnetUser = { customerId: string; email: string; photoUrl: string };

/** Pelanggan yang sedang masuk ke portal, atau `null`. Akun yang dinonaktifkan atau dihapus admin langsung keluar. */
export const getSubnetUser = cache(async (): Promise<SubnetUser | null> => {
  const [payload, signature] = ((await cookies()).get(sessionCookie)?.value ?? "").split(".");
  if (!payload || !signature) return null;
  let session: { id?: unknown; exp?: unknown };
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof session.id !== "string" || typeof session.exp !== "number" || session.exp <= Date.now()) return null;

  const [account] = await requireDb()
    .select({ customerId: subnetAccounts.customerId, email: subnetAccounts.email, passwordHash: subnetAccounts.passwordHash, active: subnetAccounts.active, photoUrl: subnetAccounts.photoUrl })
    .from(subnetAccounts)
    .innerJoin(customers, eq(customers.id, subnetAccounts.customerId))
    .where(eq(subnetAccounts.customerId, session.id))
    .limit(1);
  if (!account?.active) return null;
  const expected = sign(payload, account.passwordHash);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return { customerId: account.customerId, email: account.email, photoUrl: account.photoUrl };
});

export async function requireSubnetUser() {
  const user = await getSubnetUser();
  if (!user) redirect("/subnet/login");
  return user;
}

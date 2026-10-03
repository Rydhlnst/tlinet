import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { adminUsers } from "./db/schema";

export const sessionCookie = "tl_admin";
const maxAgeSeconds = 60 * 60 * 12;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET belum diatur.");
  return "development-only-session-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function readSession(value: string | undefined) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid?: string; exp?: number };
    return typeof parsed.uid === "string" && typeof parsed.exp === "number" && parsed.exp > Date.now() ? parsed.uid : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + maxAgeSeconds * 1000 })).toString("base64url");
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

export type AdminUser = { id: string; email: string; name: string };

/** Admin yang sedang masuk, atau `null`. Akun yang sudah dihapus dari database tidak lagi dianggap masuk. */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const userId = readSession((await cookies()).get(sessionCookie)?.value);
  if (!userId || !db) return null;
  const [user] = await db
    .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name })
    .from(adminUsers)
    .where(eq(adminUsers.id, userId))
    .limit(1);
  return user ?? null;
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

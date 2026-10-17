"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireDb } from "@/lib/db";
import { subnetAccounts } from "@/lib/db/schema";
import { createSubnetSession, destroySubnetSession, subnetPasswordMatches } from "@/lib/subnet";

export type SubnetFormState = { error?: string };

const slowDown = () => new Promise((resolve) => setTimeout(resolve, 600));

export async function subnetLoginAction(_previous: SubnetFormState, formData: FormData): Promise<SubnetFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const db = requireDb();
  const [account] = username ? await db.select().from(subnetAccounts).where(eq(subnetAccounts.username, username)).limit(1) : [];
  if (!account || !(await subnetPasswordMatches(password, account.passwordHash))) {
    await slowDown();
    return { error: "Username atau kata sandi salah." };
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

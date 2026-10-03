"use server";

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/format";

export type LeadInput = {
  type: "registration" | "coverage";
  name: string;
  phone: string;
  city?: string;
  address: string;
  need?: string;
  source?: string;
  packageName?: string;
  /** Honeypot: manusia tidak mengisinya. */
  website?: string;
};

export type LeadResult = { ok: true } | { ok: false; message: string };

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

/** Mencatat kiriman formulir publik sebagai prospek di dashboard. */
export async function submitLeadAction(input: LeadInput): Promise<LeadResult> {
  if (clean(input.website, 10)) return { ok: true };

  const name = clean(input.name, 120);
  const phone = normalizePhone(clean(input.phone, 30));
  const address = clean(input.address, 500);
  if (name.length < 2) return { ok: false, message: "Nama lengkap wajib diisi." };
  if (phone.length < 9 || phone.length > 16) return { ok: false, message: "Nomor WhatsApp tidak valid." };
  if (address.length < 5) return { ok: false, message: "Alamat pemasangan wajib diisi." };

  if (db) {
    await db.insert(leads).values({
      id: crypto.randomUUID(),
      type: input.type === "coverage" ? "coverage" : "registration",
      name,
      phone,
      address,
      city: clean(input.city, 120),
      need: clean(input.need, 160),
      source: clean(input.source, 160),
      packageName: clean(input.packageName, 160),
    });
  }
  return { ok: true };
}

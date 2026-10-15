import { and, asc, desc, eq, ne } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ContentKey } from "@/lib/content/types";
import { requireDb } from "@/lib/db";
import { articles, clients, coverageAreas, customerPayments, customerPurchases, customers, faqs, invoices, leads, packageCategories, packages, siteContent } from "@/lib/db/schema";
import { slugify } from "@/lib/format";
import { prepareInvoice } from "@/lib/invoices";
import { customerHistoryKeys, type EntityDef } from "./entities";
import { customerLinkedFields } from "./linked";
import { nextMonthValues, planNextMonth } from "./monthly";
import { sanitizeDocument, sanitizeFields } from "./fields";
import type { PageDef } from "./pages";

type EntityTable = PgTable & { id: PgColumn; updatedAt: PgColumn; createdAt: PgColumn; sortOrder?: PgColumn };

const tables: Record<string, EntityTable> = {
  packages,
  "package-categories": packageCategories,
  "coverage-areas": coverageAreas,
  faqs,
  articles,
  clients,
  leads,
  customers,
  "customer-payments": customerPayments,
  "customer-purchases": customerPurchases,
  invoices,
};

export type SaveResult = { ok: true; message: string } | { ok: false; message: string };

export type RecordRow = Record<string, unknown> & { id: string };

export async function listRecords(entity: EntityDef): Promise<RecordRow[]> {
  const table = tables[entity.key];
  const order =
    entity.key === "articles"
      ? [desc(articles.publishDate), desc(articles.createdAt)]
      : entity.key === "packages"
        ? [asc(packages.categoryId), asc(packages.sortOrder)]
        : entity.key === "customers"
        ? [asc(customers.name)]
        : entity.key === "customer-payments"
        ? [desc(customerPayments.period), desc(customerPayments.createdAt)]
        : entity.key === "customer-purchases"
        ? [desc(customerPurchases.period), desc(customerPurchases.createdAt)]
        : entity.key === "invoices"
        ? [desc(invoices.issueDate), desc(invoices.createdAt)]
        : table.sortOrder
        ? [asc(table.sortOrder), asc(table.createdAt)]
        : [desc(table.createdAt)];
  return (await requireDb().select().from(table).orderBy(...order)) as RecordRow[];
}

export async function saveRecord(entity: EntityDef, input: unknown): Promise<SaveResult> {
  const db = requireDb();
  const table = tables[entity.key];
  const errors: string[] = [];
  const values = sanitizeFields(entity.fields, input, errors);
  const givenId = typeof (input as { id?: unknown } | null)?.id === "string" ? (input as { id: string }).id : "";

  if (entity.key === "articles") {
    values.slug = slugify(String(values.slug || values.title));
    if (!values.slug) errors.push("Slug URL tidak boleh kosong.");
    else {
      const clash = await db
        .select({ id: articles.id })
        .from(articles)
        .where(and(eq(articles.slug, String(values.slug)), ne(articles.id, givenId)))
        .limit(1);
      if (clash.length) errors.push("Slug URL sudah dipakai artikel lain.");
    }
  }
  // Perubahan isian tertaut yang nanti ditulis ke Data Pelanggan, sumber tunggalnya.
  let ownerChanges: { id: string; values: Record<string, string> } | null = null;
  if (customerHistoryKeys.includes(entity.key) && values.customerId) {
    const [owner] = await db.select().from(customers).where(eq(customers.id, String(values.customerId))).limit(1);
    if (!owner) errors.push("Pelanggan tidak ditemukan.");
    else {
      ownerChanges = { id: owner.id, values: {} };
      for (const [key, source] of Object.entries(customerLinkedFields[entity.key] ?? {})) {
        const value = String(values[key] ?? "").trim();
        const current = String(owner[source] ?? "");
        // Isian yang diubah memperbarui pelanggannya; yang dikosongkan mengikuti nilai pelanggan.
        if (value && value !== current) ownerChanges.values[source] = value;
        values[key] = value || current;
      }
    }
  }
  if (entity.key === "invoices") await prepareInvoice(values, (input ?? {}) as Record<string, unknown>, givenId, errors);
  // Pembelian berstatus lunas harus punya tanggal bayarnya.
  if (entity.key === "customer-purchases" && values.status === "paid" && !values.paidDate) errors.push("Tanggal bayar wajib diisi bila statusnya Lunas.");
  if (errors.length) return { ok: false, message: errors[0] };

  if (ownerChanges && Object.keys(ownerChanges.values).length) {
    await db.update(customers).set({ ...ownerChanges.values, updatedAt: new Date() }).where(eq(customers.id, ownerChanges.id));
  }
  if (givenId) {
    const updated = await db.update(table).set({ ...values, updatedAt: new Date() }).where(eq(table.id, givenId)).returning({ id: table.id });
    if (!updated.length) return { ok: false, message: "Data tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  } else {
    if (entity.canCreate === false) return { ok: false, message: "Data ini tidak bisa ditambahkan dari dashboard." };
    await db.insert(table).values({ ...values, id: crypto.randomUUID() });
  }
  return { ok: true, message: `${entity.label} tersimpan.` };
}

/** Membuat tagihan bulan sesudah `source` dari tagihan bulan itu; yang sudah ada di bulan tujuan dilewati. */
export async function generateNextMonth(entity: EntityDef, source: string): Promise<SaveResult> {
  if (!entity.monthly || !/^\d{4}-\d{2}$/.test(source)) return { ok: false, message: "Bulan tagihan tidak valid." };
  const plan = planNextMonth(entity.monthly, await listRecords(entity), source);
  if (!plan?.toCreate.length) return { ok: false, message: "Tidak ada tagihan yang perlu dibuat." };
  let created = 0;
  const failures: string[] = [];
  for (const row of plan.toCreate) {
    const result = await saveRecord(entity, nextMonthValues(entity.monthly, row, plan.target));
    if (result.ok) created += 1;
    else failures.push(`${String(row.supplierName ?? "")}: ${result.message}`);
  }
  if (!created) return { ok: false, message: failures[0] ?? "Tagihan gagal dibuat." };
  return { ok: true, message: `${created} tagihan dibuat.${failures.length ? ` ${failures.length} gagal: ${failures[0]}` : ""}` };
}

export async function deleteRecord(entity: EntityDef, id: string): Promise<SaveResult> {
  const db = requireDb();
  if (entity.key === "package-categories") {
    const used = await db.select({ id: packages.id }).from(packages).where(eq(packages.categoryId, id)).limit(1);
    if (used.length) return { ok: false, message: "Kategori masih dipakai paket. Pindahkan atau hapus paketnya terlebih dahulu." };
  }
  // Riwayat pembayaran dan pembelian ikut terhapus bersama pelanggannya.
  if (entity.key === "customers") {
    await db.delete(customerPayments).where(eq(customerPayments.customerId, id));
    await db.delete(customerPurchases).where(eq(customerPurchases.customerId, id));
  }
  await db.delete(tables[entity.key]).where(eq(tables[entity.key].id, id));
  return { ok: true, message: "Data dihapus." };
}

const maxCustomerPhotos = 30;

/** Mengganti daftar foto pelanggan. Hanya URL hasil unggahan (/media/… atau https://…) yang diterima. */
export async function saveCustomerPhotos(id: string, input: unknown): Promise<SaveResult> {
  const photos = [...new Set((Array.isArray(input) ? input : []).map((item) => String(item ?? "").trim()))];
  if (photos.some((url) => !/^(\/media\/|https:\/\/)/.test(url) || url.length > 500)) return { ok: false, message: "Tautan foto tidak valid." };
  if (photos.length > maxCustomerPhotos) return { ok: false, message: `Maksimal ${maxCustomerPhotos} foto per pelanggan.` };
  const updated = await requireDb().update(customers).set({ photos, updatedAt: new Date() }).where(eq(customers.id, id)).returning({ id: customers.id });
  if (!updated.length) return { ok: false, message: "Pelanggan tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  return { ok: true, message: "Foto pelanggan tersimpan." };
}

export async function saveContent(page: PageDef, input: unknown): Promise<SaveResult> {
  const errors: string[] = [];
  const data = sanitizeDocument(page.sections, input, errors);
  if (errors.length) return { ok: false, message: errors[0] };
  const key: ContentKey = page.key;
  await requireDb()
    .insert(siteContent)
    .values({ key, data })
    .onConflictDoUpdate({ target: siteContent.key, set: { data, updatedAt: new Date() } });
  return { ok: true, message: `${page.label} tersimpan.` };
}

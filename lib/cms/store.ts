import { and, asc, desc, eq, ne } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ContentKey } from "@/lib/content/types";
import { requireDb } from "@/lib/db";
import { articles, clients, coverageAreas, faqs, leads, packageCategories, packages, siteContent } from "@/lib/db/schema";
import { slugify } from "@/lib/format";
import type { EntityDef } from "./entities";
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
  if (errors.length) return { ok: false, message: errors[0] };

  if (givenId) {
    const updated = await db.update(table).set({ ...values, updatedAt: new Date() }).where(eq(table.id, givenId)).returning({ id: table.id });
    if (!updated.length) return { ok: false, message: "Data tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  } else {
    if (entity.canCreate === false) return { ok: false, message: "Data ini tidak bisa ditambahkan dari dashboard." };
    await db.insert(table).values({ ...values, id: crypto.randomUUID() });
  }
  return { ok: true, message: `${entity.label} tersimpan.` };
}

export async function deleteRecord(entity: EntityDef, id: string): Promise<SaveResult> {
  const db = requireDb();
  if (entity.key === "package-categories") {
    const used = await db.select({ id: packages.id }).from(packages).where(eq(packages.categoryId, id)).limit(1);
    if (used.length) return { ok: false, message: "Kategori masih dipakai paket. Pindahkan atau hapus paketnya terlebih dahulu." };
  }
  await db.delete(tables[entity.key]).where(eq(tables[entity.key].id, id));
  return { ok: true, message: "Data dihapus." };
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

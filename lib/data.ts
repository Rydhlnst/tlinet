import { and, asc, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getAdmin } from "./auth";
import { defaultContent } from "./content/defaults";
import { seedArticles, seedClients, seedCoverageAreas, seedFaqs, seedPackageCategories, seedPackages } from "./content/seed-data";
import type { ContentKey, ContentMap } from "./content/types";
import { db } from "./db";
import { articles, clients, coverageAreas, faqs, packageCategories, packages, siteContent } from "./db/schema";

/** Cookie penanda mode pratinjau draf (hanya berlaku bila disertai sesi admin yang sah). */
export const previewCookie = "tl_preview";

type Row<T extends { $inferSelect: unknown }> = Omit<T["$inferSelect"], "createdAt" | "updatedAt">;

export type PackageCategory = Row<typeof packageCategories>;
export type Package = Row<typeof packages>;
export type Faq = Row<typeof faqs>;
export type CoverageArea = Row<typeof coverageAreas>;
export type Article = Row<typeof articles>;
export type Client = Row<typeof clients>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Nilai tersimpan menimpa bawaan; objek digabung per kunci, array diganti utuh. */
function mergeContent<T>(fallback: T, stored: unknown): T {
  if (!isPlainObject(fallback) || !isPlainObject(stored)) return (stored === undefined || stored === null ? fallback : stored) as T;
  const merged: Record<string, unknown> = { ...fallback };
  for (const key of Object.keys(fallback)) {
    if (key in stored) merged[key] = mergeContent(fallback[key], stored[key]);
  }
  return merged as T;
}

const getStoredContent = cache(async () => {
  if (!db) return {} as Record<string, { data: unknown; draft: unknown }>;
  const rows = await db.select().from(siteContent);
  return Object.fromEntries(rows.map((row) => [row.key, { data: row.data, draft: row.draft }]));
});

/**
 * Apakah permintaan ini sedang dalam mode pratinjau (melihat draf, bukan konten live). Dua pagar: cookie pratinjau harus
 * ada DAN pengunjung harus admin yang masuk. Pengunjung biasa tak pernah melihat draf meski cookienya entah bagaimana ada.
 */
const inPreview = cache(async () => {
  try {
    if ((await cookies()).get(previewCookie)?.value !== "1") return false;
    return Boolean(await getAdmin());
  } catch {
    return false;
  }
});

/** Konten satu halaman. Live membaca `data`; dalam mode pratinjau admin, membaca draf bila ada. */
export async function getContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const stored = await getStoredContent();
  const row = stored[key];
  const value = (await inPreview()) && row?.draft !== null && row?.draft !== undefined ? row.draft : row?.data;
  return mergeContent(defaultContent[key], value);
}

/** Daftar kunci halaman yang punya draf belum dipublikasikan, untuk ditandai di admin. */
export async function getContentDraftKeys(): Promise<ContentKey[]> {
  const stored = await getStoredContent();
  return (Object.keys(stored) as ContentKey[]).filter((key) => {
    const draft = stored[key]?.draft;
    return draft !== null && draft !== undefined;
  });
}

/** Konten draf satu halaman untuk disunting di editor admin (meneruskan draf yang ada, bukan mulai dari live). */
export async function getDraftContent<K extends ContentKey>(key: K): Promise<{ content: ContentMap[K]; hasDraft: boolean }> {
  const stored = await getStoredContent();
  const row = stored[key];
  const hasDraft = row?.draft !== null && row?.draft !== undefined;
  return { content: mergeContent(defaultContent[key], hasDraft ? row?.draft : row?.data), hasDraft };
}

export async function getPackageCategories(): Promise<PackageCategory[]> {
  if (!db) return seedPackageCategories;
  return db.select().from(packageCategories).where(eq(packageCategories.active, true)).orderBy(asc(packageCategories.sortOrder));
}

export async function getPackages(): Promise<Package[]> {
  if (!db) return seedPackages;
  return db.select().from(packages).where(eq(packages.active, true)).orderBy(asc(packages.sortOrder), asc(packages.createdAt));
}

export async function getFaqs(): Promise<Faq[]> {
  if (!db) return seedFaqs;
  return db.select().from(faqs).where(eq(faqs.active, true)).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
}

export async function getCoverageAreas(): Promise<CoverageArea[]> {
  if (!db) return seedCoverageAreas;
  return db.select().from(coverageAreas).where(eq(coverageAreas.active, true)).orderBy(asc(coverageAreas.sortOrder));
}

export async function getClients(): Promise<Client[]> {
  if (!db) return seedClients;
  return db.select().from(clients).where(eq(clients.active, true)).orderBy(asc(clients.sortOrder));
}

export const getPublishedArticles = cache(async (): Promise<Article[]> => {
  if (!db) return seedArticles;
  return db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishDate), desc(articles.createdAt));
});

export const getArticle = cache(async (slug: string): Promise<Article | undefined> => {
  if (!db) return seedArticles.find((article) => article.slug === slug);
  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);
  return article;
});

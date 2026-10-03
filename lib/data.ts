import { and, asc, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { defaultContent } from "./content/defaults";
import { seedArticles, seedClients, seedCoverageAreas, seedFaqs, seedPackageCategories, seedPackages } from "./content/seed-data";
import type { ContentKey, ContentMap } from "./content/types";
import { db } from "./db";
import { articles, clients, coverageAreas, faqs, packageCategories, packages, siteContent } from "./db/schema";

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
  if (!db) return {} as Record<string, unknown>;
  const rows = await db.select().from(siteContent);
  return Object.fromEntries(rows.map((row) => [row.key, row.data]));
});

export async function getContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const stored = await getStoredContent();
  return mergeContent(defaultContent[key], stored[key]);
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

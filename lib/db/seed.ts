import { config } from "dotenv";
import type { PgTable } from "drizzle-orm/pg-core";

config({ path: ".env.local" });

/** Mengisi konten awal. Aman dijalankan ulang: tabel yang sudah berisi tidak disentuh. */
async function main() {
  const { requireDb } = await import("./index");
  const schema = await import("./schema");
  const { defaultContent } = await import("../content/defaults");
  const seeds = await import("../content/seed-data");
  const db = requireDb();

  for (const [key, data] of Object.entries(defaultContent)) {
    await db.insert(schema.siteContent).values({ key, data }).onConflictDoNothing();
  }
  console.log("Konten halaman: siap.");

  const collections: [string, PgTable, Record<string, unknown>[]][] = [
    ["Kategori paket", schema.packageCategories, seeds.seedPackageCategories],
    ["Paket", schema.packages, seeds.seedPackages],
    ["FAQ", schema.faqs, seeds.seedFaqs],
    ["Titik jangkauan", schema.coverageAreas, seeds.seedCoverageAreas],
    ["Artikel", schema.articles, seeds.seedArticles],
    ["Klien", schema.clients, seeds.seedClients],
  ];
  for (const [label, table, rows] of collections) {
    const existing = await db.select().from(table).limit(1);
    if (existing.length) {
      console.log(`${label}: sudah berisi, dilewati.`);
      continue;
    }
    await db.insert(table).values(rows);
    console.log(`${label}: ${rows.length} baris ditambahkan.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

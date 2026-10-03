import { config } from "dotenv";
import type { PgTable } from "drizzle-orm/pg-core";

config({ path: ".env.local" });

/** Mengisi konten awal dan akun admin pertama. Aman dijalankan ulang: tabel yang sudah berisi tidak disentuh. */
async function main() {
  const { requireDb } = await import("./index");
  const schema = await import("./schema");
  const { defaultContent } = await import("../content/defaults");
  const seeds = await import("../content/seed-data");
  const { hashPassword } = await import("../password");
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

  const admins = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).limit(1);
  if (admins.length) {
    console.log("Akun admin: sudah ada, dilewati.");
  } else {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 8) {
      throw new Error("Isi ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 8 karakter) di .env.local untuk membuat akun admin.");
    }
    await db.insert(schema.adminUsers).values({ id: crypto.randomUUID(), email, passwordHash: await hashPassword(password) });
    console.log(`Akun admin dibuat: ${email}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

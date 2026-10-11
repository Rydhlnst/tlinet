import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { DynamicOptions } from "@/components/admin/field-control";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireAdmin } from "@/lib/auth";
import { customerHistoryKeys, getEntityDef } from "@/lib/cms/entities";
import { listRecords } from "@/lib/cms/store";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customers, packageCategories } from "@/lib/db/schema";

export async function generateMetadata({ params }: PageProps<"/admin/data/[entity]">): Promise<Metadata> {
  return { title: getEntityDef((await params).entity)?.label };
}

/** Pilihan dropdown yang berasal dari data lain. */
async function loadOptions(entityKey: string): Promise<DynamicOptions> {
  if (entityKey === "packages") {
    const categories = await requireDb().select().from(packageCategories).orderBy(asc(packageCategories.sortOrder));
    return { packageCategories: categories.map((category) => ({ value: category.id, label: category.name })) };
  }
  if (entityKey === "faqs") {
    const help = await getContent("help");
    return { faqCategories: help.faq.categories.map((category) => ({ value: category, label: category })) };
  }
  if (customerHistoryKeys.includes(entityKey)) {
    const rows = await requireDb().select({ id: customers.id, name: customers.name, company: customers.company, siteId: customers.siteId }).from(customers);
    // Pelanggan dikenali lewat PT-nya; nama orang hanya dipakai bila PT kosong.
    const sorted = rows.map((customer) => ({ ...customer, title: customer.company || customer.name })).sort((a, b) => a.title.localeCompare(b.title, "id"));
    return {
      // Untuk tabel: PT saja.
      customerNames: sorted.map((customer) => ({ value: customer.id, label: customer.title })),
      // Untuk pilihan di form: ditambah nama dan Site ID agar pelanggan ber-PT sama bisa dibedakan.
      customers: sorted.map((customer) => ({ value: customer.id, label: [customer.title, customer.company && customer.name, customer.siteId].filter(Boolean).join(" · ") })),
    };
  }
  return {};
}

export default async function DataPage({ params }: PageProps<"/admin/data/[entity]">) {
  await requireAdmin();
  const entity = getEntityDef((await params).entity);
  if (!entity) notFound();
  const [rows, options] = await Promise.all([listRecords(entity), loadOptions(entity.key)]);

  return <ResourceManager key={entity.key} entityKey={entity.key} rows={rows} options={options} />;
}

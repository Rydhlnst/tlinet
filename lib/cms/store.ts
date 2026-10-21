import { and, asc, desc, eq, ne } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ContentKey } from "@/lib/content/types";
import { requireDb } from "@/lib/db";
import {
  articles,
  clients,
  communityMessages,
  coverageAreas,
  customerPayments,
  customerPurchases,
  customers,
  dataCenterPayments,
  dataCenters,
  employees,
  faqs,
  invoices,
  leads,
  packageCategories,
  packages,
  salaryPayments,
  siteContent,
  subnetAccounts,
} from "@/lib/db/schema";
import { entityPermission } from "@/lib/permissions";
import { moveToTrash, snapshotRows } from "@/lib/trash";
import { formatMonth, slugify } from "@/lib/format";
import { deleteInvoicePayment, deleteInvoicePurchase, syncInvoicePayment, syncInvoicePurchase, syncPaymentInvoice } from "@/lib/invoice-payments";
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
  employees,
  salaries: salaryPayments,
  "data-centers": dataCenters,
  "data-center-payments": dataCenterPayments,
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
        : entity.key === "employees"
        ? [asc(employees.name)]
        : entity.key === "salaries"
        ? [desc(salaryPayments.period), desc(salaryPayments.createdAt)]
        : entity.key === "data-centers"
        ? [asc(dataCenters.company)]
        : entity.key === "data-center-payments"
        ? [desc(dataCenterPayments.period), desc(dataCenterPayments.createdAt)]
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
  if (entity.key === "salaries") await prepareSalary(values, (input ?? {}) as Record<string, unknown>, errors);
  if (entity.key === "data-center-payments") await prepareDataCenterPayment(values, (input ?? {}) as Record<string, unknown>, errors);
  // "-" di isian Grafik MRTG berarti tanpa grafik.
  if (entity.key === "data-centers" && values.mrtgSource === "-") values.mrtgSource = "";
  // Pembelian berstatus lunas harus punya tanggal bayarnya.
  if (entity.key === "customer-purchases" && values.status === "paid" && !values.paidDate) errors.push("Tanggal bayar wajib diisi bila statusnya Lunas.");
  if (errors.length) return { ok: false, message: errors[0] };

  if (ownerChanges && Object.keys(ownerChanges.values).length) {
    await db.update(customers).set({ ...ownerChanges.values, updatedAt: new Date() }).where(eq(customers.id, ownerChanges.id));
  }
  let savedId = givenId;
  if (givenId) {
    const updated = await db.update(table).set({ ...values, updatedAt: new Date() }).where(eq(table.id, givenId)).returning({ id: table.id });
    if (!updated.length) return { ok: false, message: "Data tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  } else {
    if (entity.canCreate === false) return { ok: false, message: "Data ini tidak bisa ditambahkan dari dashboard." };
    savedId = crypto.randomUUID();
    await db.insert(table).values({ ...values, id: savedId });
  }
  // Invoice tercatat di History Pembayaran Subnet (saling mengikuti) dan memicu tagihan pemasoknya.
  if (entity.key === "invoices") {
    await syncInvoicePayment(savedId);
    await syncInvoicePurchase(savedId);
  }
  if (entity.key === "customer-payments") await syncPaymentInvoice(savedId);
  return { ok: true, message: `${entity.label} tersimpan.` };
}

/** Pembayaran Data Center: nominal yang dikosongkan diambil dari biaya bulanan Data Center-nya; lunas harus bertanggal bayar. */
async function prepareDataCenterPayment(values: Record<string, unknown>, raw: Record<string, unknown>, errors: string[]) {
  const [dataCenter] = await requireDb().select({ monthlyFee: dataCenters.monthlyFee }).from(dataCenters).where(eq(dataCenters.id, String(values.dataCenterId))).limit(1);
  if (!dataCenter) {
    errors.push("Data Center tidak ditemukan.");
    return;
  }
  if (raw.amount === "" || raw.amount === undefined || raw.amount === null) values.amount = dataCenter.monthlyFee;
  if (values.status === "paid" && !values.paidDate) errors.push("Tanggal bayar wajib diisi bila statusnya Lunas.");
}

/**
 * Gaji: isian yang dikosongkan (gaji pokok, tunjangan, jabatan) diambil dari Data Karyawan, lalu gaji bersih dihitung
 * di server: gaji pokok + tunjangan + lembur + bonus − potongan.
 */
async function prepareSalary(values: Record<string, unknown>, raw: Record<string, unknown>, errors: string[]) {
  const blank = (key: string) => raw[key] == null || String(raw[key]).trim() === "";
  if (values.employeeId) {
    const [employee] = await requireDb().select().from(employees).where(eq(employees.id, String(values.employeeId))).limit(1);
    if (!employee) errors.push("Karyawan tidak ditemukan.");
    else {
      if (blank("baseSalary")) values.baseSalary = employee.baseSalary;
      if (blank("allowance")) values.allowance = employee.allowance;
      if (!String(values.position ?? "").trim()) values.position = employee.position;
    }
  }
  const money = (key: string) => Number(values[key]) || 0;
  const total = money("baseSalary") + money("allowance") + money("overtime") + money("bonus") - money("deduction");
  if (total < 0) errors.push("Potongan lebih besar dari total gaji.");
  values.amount = Math.max(0, total);
  if (values.status === "paid" && !values.paidDate) errors.push("Tanggal bayar wajib diisi bila statusnya Sudah dibayar.");
}

/**
 * Membuat tagihan bulan sesudah `source` dari tagihan bulan itu; yang sudah ada di bulan tujuan dilewati.
 * Dengan `customerId`, hanya tagihan pelanggan itu (dipakai di halaman detail pelanggan).
 */
export async function generateNextMonth(entity: EntityDef, source: string, customerId = ""): Promise<SaveResult> {
  if (!entity.monthly || !/^\d{4}-\d{2}$/.test(source)) return { ok: false, message: "Bulan tagihan tidak valid." };
  const rows = await listRecords(entity);
  const plan = planNextMonth(entity.monthly, customerId ? rows.filter((row) => row.customerId === customerId) : rows, source);
  if (!plan?.toCreate.length) return { ok: false, message: "Tidak ada tagihan yang perlu dibuat." };
  // Gaji hanya dibuat untuk karyawan yang masih aktif.
  if (entity.key === "salaries") {
    const active = new Set((await requireDb().select({ id: employees.id }).from(employees).where(eq(employees.status, "active"))).map((row) => row.id));
    plan.toCreate = plan.toCreate.filter((row) => active.has(String(row.employeeId)));
    if (!plan.toCreate.length) return { ok: false, message: "Tidak ada karyawan aktif yang perlu dibuatkan gaji." };
  }
  let created = 0;
  const failures: string[] = [];
  for (const row of plan.toCreate) {
    const result = await saveRecord(entity, nextMonthValues(entity.monthly, row, plan.target));
    if (result.ok) created += 1;
    else failures.push(`${String(row.supplierName ?? row.companyName ?? row.position ?? "")}: ${result.message}`);
  }
  if (!created) return { ok: false, message: failures[0] ?? "Tagihan gagal dibuat." };
  return { ok: true, message: `${created} ${entity.monthly.noun ?? "tagihan"} dibuat.${failures.length ? ` ${failures.length} gagal: ${failures[0]}` : ""}` };
}

/** Nama tabel di Tempat Sampah (lib/trash) untuk tiap jenis data. */
const trashTable: Record<string, Parameters<typeof snapshotRows>[0]> = {
  packages: "packages",
  "package-categories": "packageCategories",
  "coverage-areas": "coverageAreas",
  faqs: "faqs",
  articles: "articles",
  clients: "clients",
  leads: "leads",
  customers: "customers",
  "customer-payments": "customerPayments",
  "customer-purchases": "customerPurchases",
  invoices: "invoices",
  employees: "employees",
  salaries: "salaryPayments",
  "data-centers": "dataCenters",
  "data-center-payments": "dataCenterPayments",
};

/** Judul baris di Tempat Sampah: nama PT, nomor invoice, judul, atau nama, ditambah bulan untuk riwayat bulanan. */
async function trashTitle(row: Record<string, unknown>) {
  const text = (key: string) => String(row[key] ?? "").trim();
  let owner = "";
  if (text("customerId")) {
    const [customer] = await requireDb().select({ company: customers.company, name: customers.name }).from(customers).where(eq(customers.id, text("customerId"))).limit(1);
    owner = customer ? customer.company || customer.name : "";
  }
  if (text("employeeId")) {
    const [employee] = await requireDb().select({ name: employees.name }).from(employees).where(eq(employees.id, text("employeeId"))).limit(1);
    owner = employee?.name ?? "";
  }
  if (text("dataCenterId")) {
    const [dataCenter] = await requireDb().select({ company: dataCenters.company }).from(dataCenters).where(eq(dataCenters.id, text("dataCenterId"))).limit(1);
    owner = dataCenter?.company ?? "";
  }
  const main = text("number") || text("company") || text("supplierName") || owner || text("title") || text("name") || text("question");
  const period = text("period");
  return [main, text("number") && owner, period && formatMonth(period)].filter(Boolean).join(" · ");
}

/** Menghapus satu data. Salinannya (beserta data yang ikut terhapus atau berubah) masuk Tempat Sampah supaya bisa dikembalikan. */
export async function deleteRecord(entity: EntityDef, id: string, deletedBy = ""): Promise<SaveResult> {
  const db = requireDb();
  if (entity.key === "package-categories") {
    const used = await db.select({ id: packages.id }).from(packages).where(eq(packages.categoryId, id)).limit(1);
    if (used.length) return { ok: false, message: "Kategori masih dipakai paket. Pindahkan atau hapus paketnya terlebih dahulu." };
  }
  // Riwayat gaji adalah catatan keuangan: karyawannya dinonaktifkan, bukan dihapus.
  if (entity.key === "employees") {
    const used = await db.select({ id: salaryPayments.id }).from(salaryPayments).where(eq(salaryPayments.employeeId, id)).limit(1);
    if (used.length) return { ok: false, message: "Karyawan ini sudah punya riwayat gaji. Ubah statusnya menjadi Nonaktif." };
  }
  const name = trashTable[entity.key];
  const saved = name ? [await snapshotRows(name, eq(tables[entity.key].id, id))] : [];
  if (name && !saved[0].rows.length) return { ok: false, message: "Data tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  if (entity.key === "invoices") {
    saved.push(await snapshotRows("customerPayments", eq(customerPayments.invoiceId, id)), await snapshotRows("customerPurchases", eq(customerPurchases.invoiceId, id)));
  }
  if (entity.key === "customers") {
    saved.push(
      await snapshotRows("customerPayments", eq(customerPayments.customerId, id)),
      await snapshotRows("customerPurchases", eq(customerPurchases.customerId, id)),
      await snapshotRows("subnetAccounts", eq(subnetAccounts.customerId, id)),
      // Pesan Forum ikut terhapus oleh database (foreign key) bersama pelanggannya.
      await snapshotRows("communityMessages", eq(communityMessages.customerId, id)),
    );
  }
  if (entity.key === "data-centers") saved.push(await snapshotRows("dataCenterPayments", eq(dataCenterPayments.dataCenterId, id)));
  if (entity.key === "invoices") {
    await deleteInvoicePayment(id);
    await deleteInvoicePurchase(id);
  }
  // Riwayat pembayaran dan pembelian, serta akun portal Subnet, ikut terhapus bersama pelanggannya.
  if (entity.key === "customers") {
    await db.delete(customerPayments).where(eq(customerPayments.customerId, id));
    await db.delete(customerPurchases).where(eq(customerPurchases.customerId, id));
    await db.delete(subnetAccounts).where(eq(subnetAccounts.customerId, id));
  }
  // Riwayat pembayaran ikut terhapus (dan ikut dikembalikan) bersama Data Center-nya.
  if (entity.key === "data-centers") await db.delete(dataCenterPayments).where(eq(dataCenterPayments.dataCenterId, id));
  await db.delete(tables[entity.key]).where(eq(tables[entity.key].id, id));
  if (saved.length) {
    await moveToTrash({ kind: entity.key, label: entity.singular[0].toUpperCase() + entity.singular.slice(1), title: await trashTitle(saved[0].rows[0]), permission: entityPermission(entity.key), deletedBy, tables: saved });
  }
  return { ok: true, message: "Data dipindahkan ke Tempat Sampah. Masih bisa dikembalikan selama 30 hari." };
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

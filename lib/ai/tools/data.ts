import { revalidatePath } from "next/cache";
import { entityDefs, getEntityDef, type EntityDef } from "@/lib/cms/entities";
import type { Field } from "@/lib/cms/fields";
import { deleteRecord, listRecords, saveRecord, type RecordRow } from "@/lib/cms/store";
import { can, entityPermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/ai/audit";
import type { ToolContext, ToolDef, ToolResult } from "@/lib/ai/types";

/**
 * Tool CRUD generik untuk SEMUA jenis data KECUALI buku besar keuangan. Entitas keuangan ({@link READONLY}) hanya bisa
 * dibaca, tidak boleh dibuat/diubah/dihapus oleh AI. Setiap tool penulis minta konfirmasi dulu (pratayang) dan baru
 * menjalankan perubahan saat runtime memanggil ulang dengan `commit` — sehingga manusia selalu menekan tombol terakhir.
 */

/** Buku besar keuangan: AI boleh membaca, tapi tidak boleh menulis. */
const READONLY = new Set(["invoices", "customer-payments", "customer-purchases", "salaries", "data-center-payments"]);

const err = (message: string): ToolResult => ({ ok: false, summary: "", error: message });
const asObject = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** Menyegarkan halaman publik & admin setelah tulis. Aman dipanggil di luar konteks revalidate (mis. saat uji). */
function refreshAfterWrite(entity: EntityDef) {
  try {
    if (!entity.internal) revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
  } catch {
    /* di luar request handler, abaikan */
  }
}

/** Label singkat sebuah baris untuk ringkasan/konfirmasi. */
function rowTitle(entity: EntityDef, values: Record<string, unknown>): string {
  for (const key of [...entity.searchKeys, "company", "name", "title", "number", "question", "label"]) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return typeof values.id === "string" ? values.id : `(${entity.singular})`;
}

/** Ringkasan field→nilai untuk kartu konfirmasi (hanya field yang disebut). */
function describeValues(entity: EntityDef, values: Record<string, unknown>): string {
  const names = new Map(entity.fields.map((field) => [field.name, field.label] as const));
  const lines = Object.entries(values)
    .filter(([key]) => names.has(key))
    .map(([key, value]) => `• ${names.get(key)}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
  return lines.length ? lines.join("\n") : "(tidak ada field dikenali)";
}

function describeField(field: Field) {
  const base: Record<string, unknown> = { name: field.name, label: field.label, type: field.type, required: Boolean(field.required) };
  if (field.help) base.help = field.help;
  if (field.type === "select") {
    if (field.options) base.options = field.options.map((option) => option.value);
    if (field.optionsFrom) base.optionsFrom = `Pakai data_list('${field.optionsFrom}') untuk id yang valid.`;
  }
  return base;
}

/** Null bila boleh menulis; ToolResult error bila tidak. */
function writeGuard(entity: EntityDef, ctx: ToolContext, op: "create" | "update" | "delete"): ToolResult | null {
  if (READONLY.has(entity.key)) return err(`${entity.label} adalah data keuangan dan hanya bisa dibaca, tidak bisa diubah lewat AI.`);
  if (!can(ctx.admin, entityPermission(entity.key))) return err("Anda tidak punya akses untuk mengubah data ini.");
  if (op === "create" && entity.canCreate === false) return err(`${entity.label} tidak bisa ditambahkan.`);
  return null;
}

/** Menyembunyikan biaya ke NAP (data keuangan) dari hasil baca pelanggan bila pemanggil tak punya hak Keuangan. */
function scrub(entity: EntityDef, ctx: ToolContext, row: RecordRow): RecordRow {
  if (entity.key === "customers" && !can(ctx.admin, "finance")) {
    const { napFee: _napFee, ...rest } = row;
    return rest as RecordRow;
  }
  return row;
}

const findRow = async (entity: EntityDef, id: string) => (await listRecords(entity)).find((row) => row.id === id);

/** Baris ringkas untuk data_list: hanya id + field pencarian + kolom tabel, agar hemat token & tak terpotong. */
function compactRow(entity: EntityDef, ctx: ToolContext, row: RecordRow): Record<string, unknown> {
  const keep = new Set<string>(["id", ...entity.searchKeys, ...entity.columns.map((column) => column.key)]);
  const scrubbed = scrub(entity, ctx, row);
  const out: Record<string, unknown> = {};
  for (const key of keep) if (key in scrubbed) out[key] = scrubbed[key];
  return out;
}

/** Bila ada field pilihan (opsi inline) diisi nilai di luar daftar, kembalikan pesan yang menyebut pilihan yang sah. */
function selectIssue(entity: EntityDef, values: Record<string, unknown>): string | null {
  for (const field of entity.fields) {
    if (field.type === "select" && field.options && field.name in values) {
      const value = String(values[field.name] ?? "");
      if (value && !field.options.some((option) => option.value === value)) {
        return `Nilai "${value}" untuk ${field.label} tidak valid. Pilihan yang benar: ${field.options.map((option) => option.value).join(", ")}.`;
      }
    }
  }
  return null;
}

const data_catalog: ToolDef = {
  name: "data_catalog",
  description:
    "Daftar jenis data yang bisa dibaca/diubah beserta field isiannya. SELALU panggil ini dulu sebelum membuat atau mengubah data agar tahu nama field yang benar. Beri `entity` untuk detail field satu jenis data.",
  parameters: { type: "object", properties: { entity: { type: "string", description: "Kunci jenis data, mis. 'faqs'. Kosongkan untuk ringkasan semua." } }, additionalProperties: false },
  readOnly: true,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const visible = entityDefs.filter((entity) => can(ctx.admin, entityPermission(entity.key)));
    if (typeof args.entity === "string" && args.entity) {
      const entity = getEntityDef(args.entity);
      if (!entity || !can(ctx.admin, entityPermission(entity.key))) return err("Jenis data tidak ditemukan atau Anda tidak punya akses.");
      return {
        ok: true,
        summary: `Field ${entity.label} (${entity.key}): ${entity.fields.map((field) => field.name).join(", ")}.`,
        data: { key: entity.key, label: entity.label, writable: !READONLY.has(entity.key), creatable: !READONLY.has(entity.key) && entity.canCreate !== false, fields: entity.fields.map(describeField) },
      };
    }
    return {
      ok: true,
      summary: `${visible.length} jenis data tersedia. Keuangan (invoice, pembayaran, pembelian, gaji) hanya-baca.`,
      data: visible.map((entity) => ({ key: entity.key, label: entity.label, description: entity.description, writable: !READONLY.has(entity.key), creatable: !READONLY.has(entity.key) && entity.canCreate !== false })),
    };
  },
};

const data_list: ToolDef = {
  name: "data_list",
  description: "Daftar baris sebuah jenis data (hanya-baca), dengan pencarian teks dan batas jumlah opsional.",
  parameters: {
    type: "object",
    properties: {
      entity: { type: "string", description: "Kunci jenis data, mis. 'customers'." },
      search: { type: "string", description: "Kata kunci pencarian (opsional)." },
      limit: { type: "integer", minimum: 1, maximum: 100, description: "Maksimum baris (default 20)." },
    },
    required: ["entity"],
    additionalProperties: false,
  },
  readOnly: true,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const entity = getEntityDef(String(args.entity ?? ""));
    if (!entity) return err("Jenis data tidak dikenal.");
    if (!can(ctx.admin, entityPermission(entity.key))) return err("Anda tidak punya akses ke data ini.");
    let rows = await listRecords(entity);
    const search = typeof args.search === "string" ? args.search.trim().toLowerCase() : "";
    if (search) rows = rows.filter((row) => entity.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)));
    const limit = Number.isFinite(Number(args.limit)) ? Math.min(100, Math.max(1, Math.round(Number(args.limit)))) : 20;
    const total = rows.length;
    const items = rows.slice(0, limit).map((row) => compactRow(entity, ctx, row));
    return { ok: true, summary: `${total} ${entity.label}${search ? ` cocok "${search}"` : ""}${total > limit ? `, menampilkan ${limit} teratas` : ""}.`, data: { entity: entity.key, total, items, note: "Ringkas — pakai data_get(id) untuk detail lengkap." } };
  },
};

const data_get: ToolDef = {
  name: "data_get",
  description: "Mengambil satu baris data berdasarkan id (hanya-baca).",
  parameters: { type: "object", properties: { entity: { type: "string" }, id: { type: "string" } }, required: ["entity", "id"], additionalProperties: false },
  readOnly: true,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const entity = getEntityDef(String(args.entity ?? ""));
    if (!entity) return err("Jenis data tidak dikenal.");
    if (!can(ctx.admin, entityPermission(entity.key))) return err("Anda tidak punya akses ke data ini.");
    const row = await findRow(entity, String(args.id ?? ""));
    if (!row) return err("Data tidak ditemukan.");
    return { ok: true, summary: `${entity.singular}: ${rowTitle(entity, row)}.`, data: scrub(entity, ctx, row) };
  },
};

const data_create: ToolDef = {
  name: "data_create",
  description: "Menambah satu baris data baru. Minta konfirmasi dulu. Tidak berlaku untuk data keuangan.",
  parameters: {
    type: "object",
    properties: { entity: { type: "string" }, values: { type: "object", description: "Pasangan field→nilai sesuai data_catalog.", additionalProperties: true } },
    required: ["entity", "values"],
    additionalProperties: false,
  },
  readOnly: false,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const entity = getEntityDef(String(args.entity ?? ""));
    if (!entity) return err("Jenis data tidak dikenal.");
    const guard = writeGuard(entity, ctx, "create");
    if (guard) return guard;
    const values = asObject(args.values);
    const issue = selectIssue(entity, values);
    if (issue) return err(issue);
    if (!ctx.commit) {
      return { ok: true, summary: `Siap menambah ${entity.singular}.`, confirm: { title: `Tambah ${entity.label}`, detail: describeValues(entity, values) }, data: { entity: entity.key, values } };
    }
    const result = await saveRecord(entity, { ...values, id: undefined });
    if (!result.ok) return err(result.message);
    await recordAudit({ admin: ctx.admin, tool: "data_create", entity: entity.key, summary: `Menambah ${entity.label}: ${rowTitle(entity, values)}`, detail: { values } });
    refreshAfterWrite(entity);
    return { ok: true, summary: result.message };
  },
};

const data_update: ToolDef = {
  name: "data_update",
  description: "Mengubah sebagian field satu baris data (field lain tidak tersentuh). Minta konfirmasi dulu. Tidak berlaku untuk data keuangan.",
  parameters: {
    type: "object",
    properties: { entity: { type: "string" }, id: { type: "string" }, values: { type: "object", description: "Field yang diubah saja.", additionalProperties: true } },
    required: ["entity", "id", "values"],
    additionalProperties: false,
  },
  readOnly: false,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const entity = getEntityDef(String(args.entity ?? ""));
    if (!entity) return err("Jenis data tidak dikenal.");
    const guard = writeGuard(entity, ctx, "update");
    if (guard) return guard;
    const id = String(args.id ?? "");
    const existing = await findRow(entity, id);
    if (!existing) return err("Data tidak ditemukan.");
    const changes = asObject(args.values);
    // Biaya ke NAP adalah angka keuangan — jangan biarkan AI mengubahnya lewat edit pelanggan.
    if (entity.key === "customers") delete changes.napFee;
    if (!Object.keys(changes).length) return err("Tidak ada field yang diubah.");
    const issue = selectIssue(entity, changes);
    if (issue) return err(issue);
    if (!ctx.commit) {
      const before = Object.fromEntries(Object.keys(changes).map((key) => [key, existing[key]]));
      const detail = Object.keys(changes)
        .map((key) => `• ${entity.fields.find((field) => field.name === key)?.label ?? key}: ${String(before[key] ?? "—")} → ${String((changes as Record<string, unknown>)[key])}`)
        .join("\n");
      return { ok: true, summary: `Siap mengubah ${entity.singular} "${rowTitle(entity, existing)}".`, confirm: { title: `Ubah ${entity.label}`, detail }, data: { entity: entity.key, id, changes } };
    }
    const result = await saveRecord(entity, { ...existing, ...changes, id });
    if (!result.ok) return err(result.message);
    await recordAudit({
      admin: ctx.admin,
      tool: "data_update",
      entity: entity.key,
      recordId: id,
      summary: `Mengubah ${entity.label}: ${rowTitle(entity, { ...existing, ...changes })}`,
      detail: { before: Object.fromEntries(Object.keys(changes).map((key) => [key, existing[key]])), after: changes },
    });
    refreshAfterWrite(entity);
    return { ok: true, summary: result.message };
  },
};

const data_delete: ToolDef = {
  name: "data_delete",
  description: "Menghapus satu baris data (dipindahkan ke Sampah, bisa dipulihkan). Minta konfirmasi dulu. Tidak berlaku untuk data keuangan.",
  parameters: { type: "object", properties: { entity: { type: "string" }, id: { type: "string" } }, required: ["entity", "id"], additionalProperties: false },
  readOnly: false,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const entity = getEntityDef(String(args.entity ?? ""));
    if (!entity) return err("Jenis data tidak dikenal.");
    const guard = writeGuard(entity, ctx, "delete");
    if (guard) return guard;
    const id = String(args.id ?? "");
    const existing = await findRow(entity, id);
    if (!existing) return err("Data tidak ditemukan.");
    if (!ctx.commit) {
      return { ok: true, summary: `Siap menghapus ${entity.singular} "${rowTitle(entity, existing)}".`, confirm: { title: `Hapus ${entity.label}`, detail: `"${rowTitle(entity, existing)}" akan dipindahkan ke Sampah dan bisa dipulihkan.`, danger: true }, data: { entity: entity.key, id } };
    }
    const result = await deleteRecord(entity, id, ctx.admin.name);
    if (!result.ok) return err(result.message);
    await recordAudit({ admin: ctx.admin, tool: "data_delete", entity: entity.key, recordId: id, summary: `Menghapus ${entity.label}: ${rowTitle(entity, existing)}`, detail: { record: existing } });
    refreshAfterWrite(entity);
    return { ok: true, summary: result.message };
  },
};

export const dataTools: ToolDef[] = [data_catalog, data_list, data_get, data_create, data_update, data_delete];

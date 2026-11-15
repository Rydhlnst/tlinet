import { revalidatePath } from "next/cache";
import { getPageDef, pageDefs, type PageDef } from "@/lib/cms/pages";
import type { Field, Section } from "@/lib/cms/fields";
import { discardContentDraft, publishContent, saveContent } from "@/lib/cms/store";
import { getDraftContent } from "@/lib/data";
import { can, pagePermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/ai/audit";
import type { ToolContext, ToolDef, ToolResult } from "@/lib/ai/types";

/**
 * Tool penyunting KONTEN/TAMPILAN halaman publik (nama merek, logo, teks hero, isi tiap halaman). Semua tulis masuk ke
 * DRAF lewat {@link saveContent} — situs live tidak berubah sampai `content_publish`. Tiap tool penulis minta konfirmasi.
 */

const err = (message: string): ToolResult => ({ ok: false, summary: "", error: message });
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Gabungan dalam: nilai di `patch` menimpa `base`; objek digabung per kunci, selain itu diganti. */
function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isObject(base) || !isObject(patch)) return patch;
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch)) merged[key] = key in base ? deepMerge(base[key], patch[key]) : patch[key];
  return merged;
}

/** Ringkasan field satu section untuk katalog, termasuk path objeknya di dokumen. */
function describeSection(section: Section) {
  const field = (item: Field): Record<string, unknown> => {
    const base: Record<string, unknown> = { name: item.name, label: item.label, type: item.type };
    if (item.type === "list") base.item = (item.fields ?? []).map(field);
    return base;
  };
  return { path: section.path || "(akar)", title: section.title, fields: section.fields.map(field) };
}

function guard(page: PageDef | undefined, ctx: ToolContext): page is PageDef {
  return Boolean(page && can(ctx.admin, pagePermission(page.key)));
}

function refresh() {
  try {
    revalidatePath("/", "layout");
  } catch {
    /* di luar request handler */
  }
}

const content_catalog: ToolDef = {
  name: "content_catalog",
  description:
    "Daftar halaman konten yang bisa diubah AI (nama merek, logo, teks hero, isi halaman) beserta struktur field-nya. Panggil dulu sebelum content_update agar tahu bentuk objek yang benar. Beri `page` untuk detail satu halaman.",
  parameters: { type: "object", properties: { page: { type: "string", description: "Kunci halaman, mis. 'home' atau 'settings'. Kosongkan untuk ringkasan semua." } }, additionalProperties: false },
  readOnly: true,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const visible = pageDefs.filter((page) => can(ctx.admin, pagePermission(page.key)));
    if (typeof args.page === "string" && args.page) {
      const page = getPageDef(args.page);
      if (!guard(page, ctx)) return err("Halaman tidak ditemukan atau Anda tidak punya akses.");
      return { ok: true, summary: `Struktur ${page.label} (${page.key}).`, data: { key: page.key, label: page.label, sections: page.sections.map(describeSection) } };
    }
    return { ok: true, summary: `${visible.length} halaman konten tersedia.`, data: visible.map((page) => ({ key: page.key, label: page.label, description: page.description, publicPath: page.publicPath })) };
  },
};

const content_get: ToolDef = {
  name: "content_get",
  description: "Isi konten sebuah halaman saat ini (draf bila ada, selain itu yang live). Hanya-baca.",
  parameters: { type: "object", properties: { page: { type: "string" } }, required: ["page"], additionalProperties: false },
  readOnly: true,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const page = getPageDef(String(args.page ?? ""));
    if (!guard(page, ctx)) return err("Halaman tidak ditemukan atau Anda tidak punya akses.");
    const { content, hasDraft } = await getDraftContent(page.key);
    return { ok: true, summary: `Konten ${page.label}${hasDraft ? " (ada draf belum dipublikasikan)" : ""}.`, data: { page: page.key, hasDraft, content } };
  },
};

const content_update: ToolDef = {
  name: "content_update",
  description:
    "Mengubah sebagian konten sebuah halaman (nama merek, logo, teks, dll.). Kirim hanya bagian yang diubah dalam bentuk objek bersarang sesuai content_catalog. Perubahan masuk ke DRAF (tidak langsung tampil) dan minta konfirmasi dulu.",
  parameters: {
    type: "object",
    properties: { page: { type: "string" }, values: { type: "object", description: "Potongan konten yang diubah, bersarang sesuai struktur halaman.", additionalProperties: true } },
    required: ["page", "values"],
    additionalProperties: false,
  },
  readOnly: false,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const page = getPageDef(String(args.page ?? ""));
    if (!guard(page, ctx)) return err("Halaman tidak ditemukan atau Anda tidak punya akses.");
    const patch = args.values;
    if (!isObject(patch) || !Object.keys(patch).length) return err("Tidak ada perubahan konten.");
    const { content } = await getDraftContent(page.key);
    const merged = deepMerge(content, patch);
    if (!ctx.commit) {
      return {
        ok: true,
        summary: `Siap menyimpan draf perubahan ${page.label}.`,
        confirm: { title: `Ubah konten ${page.label}`, detail: `Perubahan masuk ke draf dulu, tidak langsung tampil ke pengunjung:\n${JSON.stringify(patch, null, 2).slice(0, 800)}` },
        data: { page: page.key, patch },
      };
    }
    const result = await saveContent(page, merged, "ai");
    if (!result.ok) return err(result.message);
    await recordAudit({ admin: ctx.admin, tool: "content_update", entity: `content:${page.key}`, summary: `Menyimpan draf konten ${page.label}`, detail: { patch } });
    refresh();
    return { ok: true, summary: `${result.message} Gunakan content_publish bila sudah yakin.` };
  },
};

const content_publish: ToolDef = {
  name: "content_publish",
  description: "Mempublikasikan draf sebuah halaman sehingga perubahannya tampil ke pengunjung. Minta konfirmasi dulu.",
  parameters: { type: "object", properties: { page: { type: "string" } }, required: ["page"], additionalProperties: false },
  readOnly: false,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const page = getPageDef(String(args.page ?? ""));
    if (!guard(page, ctx)) return err("Halaman tidak ditemukan atau Anda tidak punya akses.");
    const { hasDraft } = await getDraftContent(page.key);
    if (!hasDraft) return err(`Tidak ada draf ${page.label} untuk dipublikasikan.`);
    if (!ctx.commit) return { ok: true, summary: `Siap mempublikasikan ${page.label}.`, confirm: { title: `Publikasikan ${page.label}`, detail: "Draf akan tampil ke semua pengunjung situs.", danger: true }, data: { page: page.key } };
    const result = await publishContent(page);
    if (!result.ok) return err(result.message);
    await recordAudit({ admin: ctx.admin, tool: "content_publish", entity: `content:${page.key}`, summary: `Mempublikasikan konten ${page.label}` });
    refresh();
    return { ok: true, summary: result.message };
  },
};

const content_discard: ToolDef = {
  name: "content_discard",
  description: "Membuang draf sebuah halaman tanpa menyentuh konten yang sedang tampil. Minta konfirmasi dulu.",
  parameters: { type: "object", properties: { page: { type: "string" } }, required: ["page"], additionalProperties: false },
  readOnly: false,
  permission: null,
  async handler(args, ctx): Promise<ToolResult> {
    const page = getPageDef(String(args.page ?? ""));
    if (!guard(page, ctx)) return err("Halaman tidak ditemukan atau Anda tidak punya akses.");
    const { hasDraft } = await getDraftContent(page.key);
    if (!hasDraft) return err(`Tidak ada draf ${page.label}.`);
    if (!ctx.commit) return { ok: true, summary: `Siap membuang draf ${page.label}.`, confirm: { title: `Buang draf ${page.label}`, detail: "Semua perubahan draf hilang; konten live tidak berubah.", danger: true }, data: { page: page.key } };
    const result = await discardContentDraft(page);
    if (!result.ok) return err(result.message);
    await recordAudit({ admin: ctx.admin, tool: "content_discard", entity: `content:${page.key}`, summary: `Membuang draf konten ${page.label}` });
    refresh();
    return { ok: true, summary: result.message };
  },
};

export const contentTools: ToolDef[] = [content_catalog, content_get, content_update, content_publish, content_discard];

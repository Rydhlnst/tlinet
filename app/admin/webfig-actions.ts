"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminWith } from "@/lib/auth";
import type { SaveResult } from "@/lib/cms/store";
import type { LinkItem } from "@/lib/content/types";
import { requireDb } from "@/lib/db";
import { siteContent } from "@/lib/db/schema";
import { maxRouters, validateRouter } from "@/lib/router-links";

const expired: SaveResult = { ok: false, message: "Sesi berakhir atau Anda tidak punya akses untuk mengelola router." };

/** Daftar router tersimpan, dibaca langsung (tanpa cache) supaya penambahan beruntun tidak saling menimpa. */
async function readRouters(): Promise<LinkItem[]> {
  const [row] = await requireDb().select({ data: siteContent.data }).from(siteContent).where(eq(siteContent.key, "routers")).limit(1);
  const links = (row?.data as { links?: unknown } | undefined)?.links;
  return Array.isArray(links) ? (links as LinkItem[]) : [];
}

/** Router langsung live: ditulis ke `data`, tidak lewat draf. */
async function writeRouters(links: LinkItem[]) {
  const data = { links };
  await requireDb()
    .insert(siteContent)
    .values({ key: "routers", data })
    .onConflictDoUpdate({ target: siteContent.key, set: { data, draft: null, draftBy: null, draftAt: null, updatedAt: new Date() } });
  revalidatePath("/admin/webfig");
}

/** Menambah router (`index` null) atau mengubah router pada `index`. */
export async function saveRouterAction(index: number | null, input: { label: string; href: string }): Promise<SaveResult> {
  if (!(await getAdminWith("settings"))) return expired;
  const checked = validateRouter(input);
  if (!checked.ok) return checked;
  const links = await readRouters();
  if (index === null) {
    if (links.length >= maxRouters) return { ok: false, message: `Maksimal ${maxRouters} router.` };
    links.push(checked.router);
  } else {
    if (!links[index]) return { ok: false, message: "Router tidak ditemukan; muat ulang halaman lalu coba lagi." };
    links[index] = checked.router;
  }
  await writeRouters(links);
  return { ok: true, message: index === null ? `Router ${checked.router.label} ditambahkan.` : `Router ${checked.router.label} diperbarui.` };
}

/** Menghapus router; `href` dicocokkan agar yang terhapus memang yang dipilih walau daftar berubah di tab lain. */
export async function deleteRouterAction(index: number, href: string): Promise<SaveResult> {
  if (!(await getAdminWith("settings"))) return expired;
  const links = await readRouters();
  const position = links[index]?.href === href ? index : links.findIndex((link) => link.href === href);
  if (position < 0) return { ok: false, message: "Router sudah tidak ada; muat ulang halaman." };
  const [removed] = links.splice(position, 1);
  await writeRouters(links);
  return { ok: true, message: `Router ${removed.label} dihapus.` };
}

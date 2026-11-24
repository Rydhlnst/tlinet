import type { LinkItem } from "@/lib/content/types";

export const maxRouters = 50;

/**
 * Merapikan alamat WebFig yang diketik admin. Alamat tanpa skema (mis. "192.168.88.1" atau "router.domain:8080")
 * otomatis diberi "http://" — WebFig umumnya HTTP. Hanya http/https yang diterima. `null` bila tidak valid.
 */
export function normalizeRouterHref(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`;
  try {
    const url = new URL(withScheme);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
    return withScheme;
  } catch {
    return null;
  }
}

/** Memeriksa satu router; mengembalikan versi rapi atau pesan galat yang bisa ditampilkan ke admin. */
export function validateRouter(input: { label?: unknown; href?: unknown }): { ok: true; router: LinkItem } | { ok: false; message: string } {
  const label = String(input.label ?? "").trim().slice(0, 80);
  if (!label) return { ok: false, message: "Nama router wajib diisi." };
  const href = normalizeRouterHref(String(input.href ?? ""));
  if (!href) return { ok: false, message: "Alamat WebFig tidak valid. Contoh: http://192.168.88.1 atau http://router.domain.com:8080" };
  return { ok: true, router: { label, href } };
}

/** Berkas PDF dikenali dari akhiran alamatnya (kunci R2 dan /media/<id>.pdf sama-sama berakhiran .pdf). */
export const isPdfUrl = (url: string) => /\.pdf(?:$|[?#])/i.test(url);

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Makassar",
});

/** "2026-03-10" → "10 Maret 2026" */
export function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

export function formatDateTime(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateTimeFormat.format(date);
}

const monthFormat = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("id-ID");

/** "2026-10" → "Oktober 2026" */
export function formatMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : monthFormat.format(date);
}

/** 450000 → "Rp450.000", -5000 → "-Rp5.000" */
export function formatRupiah(value: number) {
  return `${value < 0 ? "-" : ""}Rp${numberFormat.format(Math.abs(value))}`;
}

/** Menyisakan angka dan mengubah awalan 0 menjadi 62 agar cocok untuk wa.me. */
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export function whatsappUrl(number: string, message = "") {
  const base = `https://wa.me/${normalizePhone(number)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Tautan konten boleh berisi kata kunci "whatsapp", yang diganti dengan tautan chat. */
export function resolveHref(href: string, whatsapp: string) {
  return href === "whatsapp" ? whatsapp : href || "#";
}

/** "112,09 Mbps" dari bit per detik. */
export function formatBitrate(bps: number) {
  const units = ["bps", "Kbps", "Mbps", "Gbps"];
  let value = bps;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: value < 10 ? 2 : 1 })} ${units[unit]}`;
}

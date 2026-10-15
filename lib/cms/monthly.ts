import type { EntityDef } from "./entities";

type Row = Record<string, unknown>;

/** Bulan sesudahnya dalam format "YYYY-MM" ("2026-12" → "2027-01"). */
export function nextMonth(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Rencana tagihan bulan berikutnya: semua baris di bulan tagihan terakhir disalin ke bulan sesudahnya,
 * kecuali yang tagihannya sudah ada di bulan itu (dicocokkan lewat `matchKeys`).
 */
export function planNextMonth(monthly: NonNullable<EntityDef["monthly"]>, rows: Row[], source?: string) {
  const from = source ?? rows.reduce((max, row) => (String(row.period ?? "") > max ? String(row.period) : max), "");
  if (!from) return null;
  const target = nextMonth(from);
  const keyOf = (row: Row) => monthly.matchKeys.map((key) => String(row[key] ?? "").trim().toLowerCase()).join("|");
  const existing = new Set(rows.filter((row) => row.period === target).map(keyOf));
  const sourceRows = rows.filter((row) => row.period === from);
  const toCreate = sourceRows.filter((row) => !existing.has(keyOf(row)));
  return { source: from, target, toCreate, skipped: sourceRows.length - toCreate.length };
}

/** Isian baris baru untuk bulan tujuan: data tetap disalin, data pembayaran dikosongkan, status belum lunas. */
export function nextMonthValues(monthly: NonNullable<EntityDef["monthly"]>, row: Row, target: string): Row {
  return { ...Object.fromEntries(monthly.copyKeys.map((key) => [key, row[key]])), period: target, status: "unpaid", paidDate: "", proofUrl: "", note: "" };
}

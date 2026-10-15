import { formatMonth } from "@/lib/format";
import type { EntityDef } from "./entities";

type Row = Record<string, unknown>;
type Monthly = NonNullable<EntityDef["monthly"]>;

/** Bulan sesudahnya dalam format "YYYY-MM" ("2026-12" → "2027-01"). */
export function nextMonth(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Tanggal yang sama sebulan kemudian; tanggal yang tidak ada di bulan itu jatuh ke hari terakhirnya (31 Jan → 28/29 Feb). */
function addMonth(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${nextMonth(date.slice(0, 7))}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Bulan tagihan sebuah baris: tujuh huruf pertama kolom bulannya, jadi kolom bulan ("2026-10") dan tanggal ("2026-10-19") sama-sama bisa. */
const monthOf = (monthly: Monthly, row: Row) => String(row[monthly.periodKey ?? "period"] ?? "").slice(0, 7);

/**
 * Rencana tagihan bulan berikutnya: semua baris di bulan tagihan terakhir disalin ke bulan sesudahnya,
 * kecuali yang tagihannya sudah ada di bulan itu (dicocokkan lewat `matchKeys`).
 */
export function planNextMonth(monthly: Monthly, rows: Row[], source?: string) {
  const from = source ?? rows.reduce((max, row) => (monthOf(monthly, row) > max ? monthOf(monthly, row) : max), "");
  if (!from) return null;
  const target = nextMonth(from);
  const keyOf = (row: Row) => monthly.matchKeys.map((key) => String(row[key] ?? "").trim().toLowerCase()).join("|");
  const existing = new Set(rows.filter((row) => monthOf(monthly, row) === target).map(keyOf));
  const sourceRows = rows.filter((row) => monthOf(monthly, row) === from);
  const toCreate = sourceRows.filter((row) => !existing.has(keyOf(row)));
  return { source: from, target, toCreate, skipped: sourceRows.length - toCreate.length };
}

/** Isian baris baru untuk bulan tujuan: data tetap disalin, data pembayaran dikosongkan, status belum lunas. */
export function nextMonthValues(monthly: Monthly, row: Row, target: string): Row {
  const copied = Object.fromEntries(monthly.copyKeys.map((key) => [key, row[key]]));
  if (monthly.kind !== "invoice") return { ...copied, period: target, status: "unpaid", paidDate: "", proofUrl: "", transferProofUrl: "", note: "" };

  // Invoice: tanggal maju sebulan dengan jarak jatuh tempo yang sama, dan nama bulan di item ikut berganti.
  const issueDate = String(row.issueDate ?? "");
  const nextIssue = addMonth(issueDate);
  const before = formatMonth(issueDate.slice(0, 7));
  const after = formatMonth(target);
  const rename = (text: unknown) => String(text ?? "").split(before).join(after).split(before.toUpperCase()).join(after.toUpperCase());
  const items = Array.isArray(row.items) ? row.items.map((item: Row) => ({ ...item, description: rename(item.description), note: rename(item.note) })) : [];
  return {
    ...copied,
    items,
    number: "",
    status: "unpaid",
    issueDate: nextIssue,
    dueDate: row.dueDate ? addDays(nextIssue, daysBetween(issueDate, String(row.dueDate))) : "",
    periodStart: row.periodStart ? addMonth(String(row.periodStart)) : "",
    periodEnd: row.periodEnd ? addMonth(String(row.periodEnd)) : "",
  };
}

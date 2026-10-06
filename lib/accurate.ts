import { createHmac } from "node:crypto";

const token = process.env.ACCURATE_API_TOKEN;
const secret = process.env.ACCURATE_SIGNATURE_SECRET;

/** "ready" bila API Token dan Signature Secret terisi, "incomplete" bila hanya salah satu, "off" bila kosong. */
export const accurateMode: "ready" | "incomplete" | "off" = token && secret ? "ready" : token || secret ? "incomplete" : "off";

type Json = Record<string, unknown>;
type AccurateResponse = { s?: boolean; d?: unknown; sp?: { pageCount?: number } };

/** Tanda tangan API Token: HMAC-SHA256 heksadesimal atas timestamp ISO, dengan Signature Secret sebagai kuncinya. */
function authHeaders() {
  const timestamp = new Date().toISOString();
  return {
    Authorization: `Bearer ${token}`,
    "X-Api-Timestamp": timestamp,
    "X-Api-Signature": createHmac("sha256", secret!).update(timestamp).digest("hex"),
  };
}

const messageOf = (body: AccurateResponse | null, status: number) => {
  const detail = Array.isArray(body?.d) ? body.d.join(" ") : typeof body?.d === "string" ? body.d : "";
  return detail || `Accurate menolak permintaan (${status}).`;
};

/** Memanggil API Accurate dengan API Token. Melempar galat berisi pesan dari Accurate bila ditolak. */
async function accurateFetch(url: string, method: "GET" | "POST" = "GET"): Promise<AccurateResponse> {
  if (accurateMode !== "ready") throw new Error("Accurate belum diatur.");
  const response = await fetch(url, { method, headers: authHeaders(), cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const body = (await response.json().catch(() => null)) as AccurateResponse | null;
  if (!response.ok || body?.s === false) throw new Error(messageOf(body, response.status));
  return body ?? {};
}

export type AccurateDatabase = { name: string; host: string };

const databaseTtl = 10 * 60_000;
let cachedDatabase: { value: AccurateDatabase; at: number } | null = null;

/** Database Accurate yang terikat pada API Token ini. `fresh` memaksa tanya ulang, dipakai untuk uji koneksi. */
export async function getAccurateDatabase(fresh = false): Promise<AccurateDatabase> {
  if (!fresh && cachedDatabase && Date.now() - cachedDatabase.at < databaseTtl) return cachedDatabase.value;
  const body = await accurateFetch("https://account.accurate.id/api/api-token.do", "POST");
  const database = ((body.d as Json | undefined)?.database ?? {}) as Json;
  const host = String(database.host ?? "");
  if (!host) throw new Error("Accurate tidak mengembalikan alamat database.");
  cachedDatabase = { value: { name: String(database.alias ?? "Database Accurate"), host: host.replace(/\/$/, "") }, at: Date.now() };
  return cachedDatabase.value;
}

/** Dashboard hanya membaca dari Accurate: semua panggilan data lewat sini adalah list.do atau detail.do. */
async function read(path: string, params: Record<string, string | number>) {
  const { host } = await getAccurateDatabase();
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]));
  return accurateFetch(`${host}/accurate/api/${path}?${query}`);
}

const pageSize = 100;

/** Mengambil semua halaman sebuah daftar, dibatasi `maxPages` agar tidak berputar tanpa akhir. */
async function readAll(path: string, params: Record<string, string | number>, maxPages = 20): Promise<Json[]> {
  const rows: Json[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const body = await read(path, { ...params, "sp.page": page, "sp.pageSize": pageSize });
    rows.push(...((body.d as Json[] | undefined) ?? []));
    if (page >= (body.sp?.pageCount ?? 1)) break;
  }
  return rows;
}

const text = (value: unknown) => (value == null ? "" : String(value).trim());

/** "26/08/2026" → "2026-08-26" */
function isoDate(value: unknown) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text(value));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export type AccurateCustomerRef = { id: number; customerNo: string; name: string };

export async function listAccurateCustomers(): Promise<AccurateCustomerRef[]> {
  const rows = await readAll("customer/list.do", { fields: "id,customerNo,name" });
  return rows.map((row) => ({ id: Number(row.id), customerNo: text(row.customerNo), name: text(row.name) }));
}

export type AccurateCustomer = AccurateCustomerRef & { phone: string; street: string; city: string; province: string; suspended: boolean };

export async function getAccurateCustomer(id: number): Promise<AccurateCustomer> {
  const row = ((await read("customer/detail.do", { id })).d ?? {}) as Json;
  return {
    id: Number(row.id),
    customerNo: text(row.customerNo),
    name: text(row.name),
    phone: text(row.mobilePhone) || text(row.workPhone),
    street: text(row.billStreet),
    city: text(row.billCity),
    province: text(row.billProvince),
    suspended: row.suspended === true,
  };
}

export type AccurateInvoice = { id: number; number: string; date: string; total: number; owing: number; status: string };
export type AccurateReceipt = { id: number; number: string; date: string; amount: number };
export type AccurateLedger = { invoices: AccurateInvoice[]; receipts: AccurateReceipt[] };

/** Faktur penjualan dan penerimaan pembayaran satu pelanggan, terbaru lebih dulu. */
export async function getAccurateLedger(customerId: number): Promise<AccurateLedger> {
  const filter = { "filter.customerId": customerId, "sp.sort": "transDate|desc" };
  const [invoices, receipts] = await Promise.all([
    readAll("sales-invoice/list.do", { ...filter, fields: "id,number,transDate,totalAmount,primeOwing,statusName" }),
    readAll("sales-receipt/list.do", { ...filter, fields: "id,number,transDate,totalPayment" }),
  ]);
  return {
    invoices: invoices.map((row) => ({
      id: Number(row.id),
      number: text(row.number),
      date: isoDate(row.transDate),
      total: Number(row.totalAmount) || 0,
      owing: Number(row.primeOwing) || 0,
      status: text(row.statusName),
    })),
    receipts: receipts.map((row) => ({ id: Number(row.id), number: text(row.number), date: isoDate(row.transDate), amount: Number(row.totalPayment) || 0 })),
  };
}

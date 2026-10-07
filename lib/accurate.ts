import { createHmac } from "node:crypto";

const token = process.env.ACCURATE_API_TOKEN;
const secret = process.env.ACCURATE_SIGNATURE_SECRET;

/** "ready" bila API Token dan Signature Secret terisi, "incomplete" bila hanya salah satu, "off" bila kosong. */
export const accurateMode: "ready" | "incomplete" | "off" = token && secret ? "ready" : token || secret ? "incomplete" : "off";

/** Form input hanya aktif bila ACCURATE_WRITE=on; tanpa itu dashboard murni membaca dan tidak bisa mengubah pembukuan. */
export const accurateWriteEnabled = accurateMode === "ready" && process.env.ACCURATE_WRITE === "on";

type Json = Record<string, unknown>;
type AccurateResponse = { s?: boolean; d?: unknown; sp?: { pageCount?: number; rowCount?: number } };

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
async function accurateFetch(url: string, method: "GET" | "POST" = "GET", form?: URLSearchParams): Promise<AccurateResponse> {
  if (accurateMode !== "ready") throw new Error("Accurate belum diatur.");
  const response = await fetch(url, { method, body: form, headers: authHeaders(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
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

/** Semua pembacaan data lewat sini: list.do atau detail.do. */
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
export function isoDate(value: unknown) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text(value));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export type AccuratePage = { rows: Json[]; rowCount: number; pageCount: number };

/** Satu halaman daftar dari modul Accurate mana pun, dengan pencarian kata kunci. */
export async function listAccurate(
  path: string,
  options: { fields: string; page: number; pageSize: number; keywords?: string; sort?: string; filter?: Record<string, string> },
): Promise<AccuratePage> {
  const body = await read(`${path}/list.do`, {
    ...options.filter,
    fields: options.fields,
    "sp.page": options.page,
    "sp.pageSize": options.pageSize,
    ...(options.sort ? { "sp.sort": options.sort } : {}),
    // Tanpa `op=CONTAIN`, Accurate hanya mencocokkan kata kunci yang persis sama.
    ...(options.keywords ? { "filter.keywords.op": "CONTAIN", "filter.keywords.val": options.keywords } : {}),
  });
  return { rows: (body.d as Json[] | undefined) ?? [], rowCount: body.sp?.rowCount ?? 0, pageCount: body.sp?.pageCount ?? 1 };
}

export type AccountBalance = { no: string; name: string; type: string; typeName: string; balance: number };

/**
 * Saldo semua akun rincian. Akun induk dibuang karena saldonya sudah merupakan jumlah anak-anaknya;
 * induk dikenali dari nomornya yang menjadi awalan nomor akun lain.
 */
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const rows = (await readAll("glaccount/list.do", { fields: "id,no,name,accountType,accountTypeName,balance" })).map((row) => ({
    no: text(row.no),
    name: text(row.name),
    type: text(row.accountType),
    typeName: text(row.accountTypeName),
    balance: Number(row.balance) || 0,
  }));
  return rows.filter((account) => !rows.some((other) => other.no !== account.no && other.no.startsWith(account.no)));
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

/** Menyimpan data baru lewat save.do. Satu-satunya jalur tulis ke Accurate, dan hanya bila form input diaktifkan. */
export async function saveAccurate(path: string, params: URLSearchParams): Promise<string> {
  if (!accurateWriteEnabled) throw new Error("Form input ke Accurate belum diaktifkan.");
  const { host } = await getAccurateDatabase();
  const body = await accurateFetch(`${host}/accurate/api/${path}/save.do`, "POST", params);
  return Array.isArray(body.d) ? body.d.map(String).join(" ") : "";
}

type Lookup = { value: string; label: string; hint?: string; fill?: Record<string, number | string> };

const lookupSize = 20;

/** Pencarian untuk field pilihan di form. `scope` membatasi faktur ke satu pelanggan atau pemasok. */
export async function searchAccurate(kind: string, keywords: string, scope: string): Promise<Lookup[]> {
  const search = (path: string, fields: string, filter: Record<string, string> = {}) =>
    listAccurate(path, { fields, page: 1, pageSize: lookupSize, keywords, filter }).then((page) => page.rows);
  const money = (value: unknown) => `Rp${new Intl.NumberFormat("id-ID").format(Number(value) || 0)}`;

  switch (kind) {
    case "customer":
      return (await search("customer", "id,customerNo,name")).map((row) => ({ value: text(row.customerNo), label: text(row.name), hint: text(row.customerNo) }));
    case "vendor":
      return (await search("vendor", "id,vendorNo,name")).map((row) => ({ value: text(row.vendorNo), label: text(row.name), hint: text(row.vendorNo) }));
    case "item":
      return (await search("item", "id,no,name,unitPrice")).map((row) => ({ value: text(row.no), label: text(row.name), hint: text(row.no), fill: { unitPrice: Number(row.unitPrice) || 0 } }));
    case "cashBank":
    case "account": {
      // Akun induk tidak bisa dipakai bertransaksi; dikenali dari nomornya yang menjadi awalan akun lain.
      const all = await readAll("glaccount/list.do", { fields: "id,no,name,accountType,accountTypeName" });
      const term = keywords.toLowerCase();
      return all
        .filter((row) => kind === "account" || row.accountType === "CASH_BANK")
        .filter((row) => !all.some((other) => other.no !== row.no && text(other.no).startsWith(text(row.no))))
        .filter((row) => !term || `${text(row.no)} ${text(row.name)}`.toLowerCase().includes(term))
        .slice(0, lookupSize)
        .map((row) => ({ value: text(row.no), label: text(row.name), hint: `${text(row.no)} · ${text(row.accountTypeName)}` }));
    }
    case "salesInvoice":
    case "purchaseInvoice": {
      if (!scope) return [];
      const [path, owner] = kind === "salesInvoice" ? ["sales-invoice", "filter.customerNo"] : ["purchase-invoice", "filter.vendorNo"];
      const rows = await search(path, "id,number,transDate,primeOwing", { [owner]: scope, "filter.outstanding": "true" });
      return rows.map((row) => ({ value: text(row.number), label: text(row.number), hint: `Sisa ${money(row.primeOwing)}`, fill: { paymentAmount: Number(row.primeOwing) || 0 } }));
    }
    default:
      return [];
  }
}

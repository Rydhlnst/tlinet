export type LookupKind = "customer" | "vendor" | "item" | "cashBank" | "account" | "salesInvoice" | "purchaseInvoice";

/** Satu pilihan hasil pencarian di Accurate. `fill` mengisi field lain di baris yang sama (mis. harga barang). */
export type LookupOption = { value: string; label: string; hint?: string; fill?: Record<string, number | string> };

type FieldBase = { name: string; label: string; required?: boolean; half?: boolean; placeholder?: string; help?: string };

export type FormField =
  | (FieldBase & { type: "text" | "textarea" | "date" | "number" })
  | (FieldBase & { type: "select"; options: { value: string; label: string }[] })
  /** `scope`: field di kepala form yang membatasi pencarian, mis. faktur milik pelanggan yang dipilih. */
  | (FieldBase & { type: "lookup"; lookup: LookupKind; scope?: string });

export type FormLine = Record<string, unknown>;

export type AccurateForm = {
  /** Jalur API tujuan simpan, sekaligus kunci form: "sales-invoice" → /accurate/api/sales-invoice/save.do. */
  path: string;
  label: string;
  fields: FormField[];
  lines?: { name: string; label: string; itemLabel: string; fields: FormField[] };
  /** Parameter kepala yang diisi jumlah sebuah field baris, mis. chequeAmount = total paymentAmount. */
  total?: { param: string; lineField: string };
  /** Parameter kepala yang selalu diisi tanggal hari ini. */
  todayParams?: string[];
  /** Jurnal: total debit harus sama dengan total kredit. */
  balanced?: boolean;
  /** Ringkasan angka di bawah baris, dihitung ulang setiap baris berubah. */
  summarize?: (lines: FormLine[]) => { label: string; value: number }[];
};

const amount = (value: unknown) => Number(String(value ?? "").replace(",", ".")) || 0;
const sumOf = (lines: FormLine[], field: string) => lines.reduce((total, line) => total + amount(line[field]), 0);

const transDate: FormField = { name: "transDate", label: "Tanggal", type: "date", required: true, half: true };
const description: FormField = { name: "description", label: "Keterangan", type: "textarea" };

const contactFields: FormField[] = [
  { name: "name", label: "Nama", type: "text", required: true },
  { name: "mobilePhone", label: "No. telepon", type: "text", half: true },
  { name: "email", label: "Email", type: "text", half: true },
  { name: "billStreet", label: "Alamat", type: "textarea" },
  { name: "billCity", label: "Kota / Kabupaten", type: "text", half: true },
  { name: "billProvince", label: "Provinsi", type: "text", half: true },
  { name: "notes", label: "Catatan", type: "textarea" },
];

const itemLines: AccurateForm["lines"] = {
  name: "detailItem",
  label: "Barang & Jasa",
  itemLabel: "barang",
  fields: [
    { name: "itemNo", label: "Barang / jasa", type: "lookup", lookup: "item", required: true },
    { name: "quantity", label: "Kuantitas", type: "number", required: true, half: true },
    { name: "unitPrice", label: "Harga satuan (Rp)", type: "number", required: true, half: true },
  ],
};

const itemTotal: AccurateForm["summarize"] = (lines) => [{ label: "Total sebelum pajak", value: lines.reduce((total, line) => total + amount(line.quantity) * amount(line.unitPrice), 0) }];

const invoiceLines = (lookup: LookupKind, scope: string): AccurateForm["lines"] => ({
  name: "detailInvoice",
  label: "Faktur yang dibayar",
  itemLabel: "faktur",
  fields: [
    { name: "invoiceNo", label: "Faktur", type: "lookup", lookup, scope, required: true, help: "Hanya faktur yang belum lunas." },
    { name: "paymentAmount", label: "Jumlah dibayar (Rp)", type: "number", required: true },
  ],
});

const paymentTotal: AccurateForm["summarize"] = (lines) => [{ label: "Total pembayaran", value: sumOf(lines, "paymentAmount") }];
const bank: FormField = { name: "bankNo", label: "Akun kas / bank", type: "lookup", lookup: "cashBank", required: true, half: true };

/** Form input ke Accurate, satu per jalur API. Hanya membuat data baru; mengubah dan menghapus tetap di Accurate. */
export const accurateForms: AccurateForm[] = [
  { path: "customer", label: "Pelanggan", fields: contactFields, todayParams: ["transDate"] },
  { path: "vendor", label: "Pemasok", fields: contactFields, todayParams: ["transDate"] },
  {
    path: "item",
    label: "Barang & Jasa",
    fields: [
      {
        name: "itemType",
        label: "Jenis",
        type: "select",
        required: true,
        half: true,
        options: [
          { value: "SERVICE", label: "Jasa" },
          { value: "INVENTORY", label: "Persediaan" },
          { value: "NON_INVENTORY", label: "Non-persediaan" },
        ],
      },
      { name: "no", label: "Kode", type: "text", half: true, help: "Kosongkan agar Accurate memberi nomor otomatis." },
      { name: "name", label: "Nama", type: "text", required: true },
      { name: "unit1Name", label: "Satuan", type: "text", half: true, placeholder: "PCS" },
      { name: "unitPrice", label: "Harga jual (Rp)", type: "number", half: true },
    ],
  },
  {
    path: "sales-invoice",
    label: "Faktur Penjualan",
    fields: [{ name: "customerNo", label: "Pelanggan", type: "lookup", lookup: "customer", required: true }, transDate, description],
    lines: itemLines,
    summarize: itemTotal,
  },
  {
    path: "sales-receipt",
    label: "Penerimaan Penjualan",
    fields: [{ name: "customerNo", label: "Pelanggan", type: "lookup", lookup: "customer", required: true }, bank, transDate],
    lines: invoiceLines("salesInvoice", "customerNo"),
    total: { param: "chequeAmount", lineField: "paymentAmount" },
    summarize: paymentTotal,
  },
  {
    path: "purchase-invoice",
    label: "Faktur Pembelian",
    fields: [
      { name: "vendorNo", label: "Pemasok", type: "lookup", lookup: "vendor", required: true },
      transDate,
      { name: "billNumber", label: "No. tagihan pemasok", type: "text", half: true },
      description,
    ],
    lines: itemLines,
    summarize: itemTotal,
  },
  {
    path: "purchase-payment",
    label: "Pembayaran Pembelian",
    fields: [{ name: "vendorNo", label: "Pemasok", type: "lookup", lookup: "vendor", required: true }, bank, transDate],
    lines: invoiceLines("purchaseInvoice", "vendorNo"),
    total: { param: "chequeAmount", lineField: "paymentAmount" },
    summarize: paymentTotal,
  },
  {
    path: "journal-voucher",
    label: "Jurnal Umum",
    fields: [transDate, description],
    lines: {
      name: "detailJournalVoucher",
      label: "Baris jurnal",
      itemLabel: "baris",
      fields: [
        { name: "accountNo", label: "Akun", type: "lookup", lookup: "account", required: true },
        {
          name: "amountType",
          label: "Posisi",
          type: "select",
          required: true,
          half: true,
          options: [
            { value: "DEBIT", label: "Debit" },
            { value: "CREDIT", label: "Kredit" },
          ],
        },
        { name: "amount", label: "Jumlah (Rp)", type: "number", required: true, half: true },
      ],
    },
    balanced: true,
    summarize: (lines) => [
      { label: "Total debit", value: sumOf(lines.filter((line) => line.amountType === "DEBIT"), "amount") },
      { label: "Total kredit", value: sumOf(lines.filter((line) => line.amountType === "CREDIT"), "amount") },
    ],
  },
];

export const getAccurateForm = (path: string) => accurateForms.find((form) => form.path === path);

/** Nilai awal satu kelompok field: tanggal diisi hari ini, pilihan diisi opsi pertama. */
export function initialValues(fields: FormField[], today: string): FormLine {
  const values: FormLine = {};
  for (const field of fields) values[field.name] = field.type === "date" ? today : field.type === "select" ? field.options[0].value : "";
  return values;
}

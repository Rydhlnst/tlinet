import { BookText, Boxes, Building2, ChartPie, Landmark, ShoppingCart, Smartphone, Tag, Warehouse, type LucideIcon } from "lucide-react";

/** Alamat masuk Accurate Online; setelah masuk, pengguna memilih database lalu modulnya. */
export const accurateWebUrl = "https://account.accurate.id";

export type AccurateColumn = {
  /** Jalur nilai di baris Accurate, boleh bertitik untuk objek bersarang ("customer.name"). */
  key: string;
  label: string;
  type?: "date" | "currency" | "flag";
  /** Label pengganti untuk nilai kode, mis. jenis barang. */
  labels?: Record<string, string>;
};

export type AccurateResource = {
  key: string;
  label: string;
  /** Jalur API, mis. "sales-invoice" untuk /accurate/api/sales-invoice/list.do. */
  path: string;
  columns: AccurateColumn[];
  sort?: string;
  filter?: Record<string, string>;
};

export type AccurateModule = {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Daftar data modul ini yang dibaca dari Accurate. Kosong berarti modulnya hanya ditautkan. */
  resources: AccurateResource[];
  /** Modul tanpa daftar: laporan dihitung dari saldo akun. */
  report?: boolean;
};

const newestFirst = "transDate|desc";
const number: AccurateColumn = { key: "number", label: "Nomor" };
const date: AccurateColumn = { key: "transDate", label: "Tanggal", type: "date" };

const salesReceipts: AccurateResource = {
  key: "penerimaan",
  label: "Penerimaan Penjualan",
  path: "sales-receipt",
  sort: newestFirst,
  columns: [number, date, { key: "customer.name", label: "Pelanggan" }, { key: "totalPayment", label: "Jumlah Diterima", type: "currency" }],
};

const purchasePayments: AccurateResource = {
  key: "pembayaran",
  label: "Pembayaran Pembelian",
  path: "purchase-payment",
  sort: newestFirst,
  columns: [number, date, { key: "vendor.name", label: "Pemasok" }, { key: "totalPayment", label: "Jumlah Dibayar", type: "currency" }],
};

/** Sembilan modul Accurate, urut seperti di menu Accurate. Hanya fitur yang sudah berisi data yang dibuatkan daftarnya. */
export const accurateModules: AccurateModule[] = [
  {
    key: "penjualan",
    label: "Penjualan",
    icon: Tag,
    description: "Pelanggan, pesanan, faktur penjualan, dan penerimaan pembayaran.",
    resources: [
      {
        key: "faktur",
        label: "Faktur Penjualan",
        path: "sales-invoice",
        sort: newestFirst,
        columns: [
          number,
          date,
          { key: "customer.name", label: "Pelanggan" },
          { key: "totalAmount", label: "Total", type: "currency" },
          { key: "primeOwing", label: "Sisa Tagihan", type: "currency" },
          { key: "statusName", label: "Status" },
        ],
      },
      salesReceipts,
      {
        key: "pesanan",
        label: "Pesanan Penjualan",
        path: "sales-order",
        sort: newestFirst,
        columns: [number, date, { key: "customer.name", label: "Pelanggan" }, { key: "totalAmount", label: "Total", type: "currency" }, { key: "statusName", label: "Status" }],
      },
      {
        key: "pelanggan",
        label: "Pelanggan",
        path: "customer",
        columns: [
          { key: "customerNo", label: "No. Pelanggan" },
          { key: "name", label: "Nama" },
          { key: "category.name", label: "Kategori" },
          { key: "mobilePhone", label: "No. Telepon" },
          { key: "email", label: "Email" },
        ],
      },
    ],
  },
  {
    key: "perusahaan",
    label: "Perusahaan",
    icon: Building2,
    description: "Cabang, karyawan, dan pajak yang dipakai perusahaan.",
    resources: [
      { key: "cabang", label: "Cabang", path: "branch", columns: [{ key: "name", label: "Nama Cabang" }, { key: "defaultBranch", label: "Cabang Utama", type: "flag" }] },
      {
        key: "karyawan",
        label: "Karyawan",
        path: "employee",
        columns: [
          { key: "number", label: "No. Karyawan" },
          { key: "name", label: "Nama" },
          { key: "mobilePhone", label: "No. Telepon" },
          { key: "email", label: "Email" },
        ],
      },
      { key: "pajak", label: "Pajak", path: "tax", columns: [{ key: "taxCode", label: "Kode" }, { key: "description", label: "Keterangan" }, { key: "taxInfo", label: "Tarif" }] },
    ],
  },
  {
    key: "laporan-keuangan",
    label: "Laporan Keuangan",
    icon: ChartPie,
    description: "Ringkasan neraca dan laba rugi dari saldo akun saat ini.",
    resources: [],
    report: true,
  },
  {
    key: "kas-bank",
    label: "Kas & Bank",
    icon: Landmark,
    description: "Saldo akun kas dan bank, uang masuk dari pelanggan, dan uang keluar ke pemasok.",
    resources: [
      {
        key: "akun",
        label: "Akun Kas & Bank",
        path: "glaccount",
        filter: { "filter.accountType": "CASH_BANK" },
        columns: [{ key: "no", label: "No. Akun" }, { key: "name", label: "Nama Akun" }, { key: "balance", label: "Saldo", type: "currency" }],
      },
      { ...salesReceipts, key: "uang-masuk", label: "Uang Masuk" },
      { ...purchasePayments, key: "uang-keluar", label: "Uang Keluar" },
    ],
  },
  {
    key: "pembelian",
    label: "Pembelian",
    icon: ShoppingCart,
    description: "Pemasok, faktur pembelian, dan pembayaran pembelian.",
    resources: [
      {
        key: "faktur",
        label: "Faktur Pembelian",
        path: "purchase-invoice",
        sort: newestFirst,
        columns: [
          number,
          { key: "billNumber", label: "No. Tagihan Pemasok" },
          date,
          { key: "vendor.name", label: "Pemasok" },
          { key: "totalAmount", label: "Total", type: "currency" },
          { key: "primeOwing", label: "Sisa Utang", type: "currency" },
          { key: "statusName", label: "Status" },
        ],
      },
      purchasePayments,
      {
        key: "pemasok",
        label: "Pemasok",
        path: "vendor",
        columns: [
          { key: "vendorNo", label: "No. Pemasok" },
          { key: "name", label: "Nama" },
          { key: "category.name", label: "Kategori" },
          { key: "mobilePhone", label: "No. Telepon" },
          { key: "email", label: "Email" },
        ],
      },
    ],
  },
  {
    key: "persediaan",
    label: "Persediaan",
    icon: Boxes,
    description: "Barang dan jasa, kategorinya, serta gudang.",
    resources: [
      {
        key: "barang",
        label: "Barang & Jasa",
        path: "item",
        columns: [
          { key: "no", label: "Kode" },
          { key: "name", label: "Nama" },
          { key: "itemType", label: "Jenis", labels: { SERVICE: "Jasa", INVENTORY: "Persediaan", NON_INVENTORY: "Non-persediaan", GROUP: "Grup" } },
          { key: "itemCategory.name", label: "Kategori" },
          { key: "unitPrice", label: "Harga Jual", type: "currency" },
        ],
      },
      { key: "kategori", label: "Kategori Barang", path: "item-category", columns: [{ key: "name", label: "Nama Kategori" }] },
      { key: "gudang", label: "Gudang", path: "warehouse", columns: [{ key: "name", label: "Nama Gudang" }, { key: "description", label: "Keterangan" }, { key: "defaultWarehouse", label: "Gudang Utama", type: "flag" }] },
    ],
  },
  {
    key: "buku-besar",
    label: "Buku Besar",
    icon: BookText,
    description: "Akun perkiraan beserta saldonya, dan jurnal umum.",
    resources: [
      {
        key: "akun",
        label: "Akun Perkiraan",
        path: "glaccount",
        columns: [
          { key: "no", label: "No. Akun" },
          { key: "name", label: "Nama Akun" },
          { key: "accountTypeName", label: "Tipe" },
          { key: "balance", label: "Saldo", type: "currency" },
        ],
      },
      { key: "jurnal", label: "Jurnal Umum", path: "journal-voucher", sort: newestFirst, columns: [number, date, { key: "description", label: "Keterangan" }] },
    ],
  },
  {
    key: "aset-tetap",
    label: "Aset Tetap",
    icon: Warehouse,
    description: "Daftar aset tetap dan nilai perolehannya.",
    resources: [
      {
        key: "aset",
        label: "Aset Tetap",
        path: "fixed-asset",
        columns: [
          number,
          { key: "description", label: "Keterangan" },
          { key: "transDate", label: "Tanggal Beli", type: "date" },
          { key: "usageDate", label: "Tanggal Pakai", type: "date" },
          { key: "assetCost", label: "Nilai Perolehan", type: "currency" },
          { key: "draft", label: "Draf", type: "flag" },
        ],
      },
    ],
  },
  {
    key: "trade-portal",
    label: "Trade Portal",
    icon: Smartphone,
    description: "Portal pemesanan untuk pelanggan dan pemasok (beta). Dibuka langsung di Accurate.",
    resources: [],
  },
];

export const getAccurateModule = (key: string) => accurateModules.find((module) => module.key === key);

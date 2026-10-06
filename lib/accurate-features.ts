import { BookText, Boxes, Building2, ChartPie, Landmark, ShoppingCart, Smartphone, Tag, Warehouse, type LucideIcon } from "lucide-react";

/** Alamat masuk Accurate Online; setelah masuk, pengguna memilih database lalu modulnya. */
export const accurateWebUrl = "https://account.accurate.id";

export type AccurateFeature = {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** `read`: datanya dibaca dan ditampilkan di dashboard. `link`: hanya ditautkan. */
  relation: "read" | "link";
  relationNote: string;
};

/** Sembilan modul Accurate yang ditautkan dari dashboard, urut seperti di menu Accurate. */
export const accurateFeatures: AccurateFeature[] = [
  {
    key: "penjualan",
    label: "Penjualan",
    icon: Tag,
    description: "Pelanggan, faktur penjualan, dan penerimaan pembayaran.",
    relation: "read",
    relationNote: "Pelanggan dan faktur penjualannya tampil di Data Pelanggan dashboard.",
  },
  {
    key: "perusahaan",
    label: "Perusahaan",
    icon: Building2,
    description: "Profil usaha, cabang, departemen, dan karyawan.",
    relation: "link",
    relationNote: "Dikelola langsung di Accurate.",
  },
  {
    key: "laporan-keuangan",
    label: "Laporan Keuangan",
    icon: ChartPie,
    description: "Neraca, laba rugi, arus kas, dan laporan lainnya.",
    relation: "link",
    relationNote: "Dikelola langsung di Accurate.",
  },
  {
    key: "kas-bank",
    label: "Kas & Bank",
    icon: Landmark,
    description: "Saldo kas dan rekening, penerimaan, pembayaran, dan transfer.",
    relation: "read",
    relationNote: "Penerimaan pembayaran pelanggan tampil di halaman detail pelanggan.",
  },
  {
    key: "pembelian",
    label: "Pembelian",
    icon: ShoppingCart,
    description: "Pemasok, pesanan pembelian, faktur, dan pembayaran pembelian.",
    relation: "link",
    relationNote: "Dikelola langsung di Accurate.",
  },
  {
    key: "persediaan",
    label: "Persediaan",
    icon: Boxes,
    description: "Barang dan jasa, gudang, serta mutasi stok.",
    relation: "link",
    relationNote: "Dikelola langsung di Accurate.",
  },
  {
    key: "buku-besar",
    label: "Buku Besar",
    icon: BookText,
    description: "Akun perkiraan dan jurnal umum.",
    relation: "link",
    relationNote: "Dikelola langsung di Accurate.",
  },
  {
    key: "aset-tetap",
    label: "Aset Tetap",
    icon: Warehouse,
    description: "Daftar aset dan penyusutannya.",
    relation: "link",
    relationNote: "Dikelola langsung di Accurate.",
  },
  {
    key: "trade-portal",
    label: "Trade Portal",
    icon: Smartphone,
    description: "Portal pemesanan untuk pelanggan dan pemasok (beta).",
    relation: "link",
    relationNote: "Dikelola langsung di Accurate.",
  },
];

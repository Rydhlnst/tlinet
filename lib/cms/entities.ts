import type { Field } from "./fields";

export type Column = {
  key: string;
  label: string;
  type?: "text" | "badge" | "boolean" | "image" | "date" | "datetime" | "whatsapp";
  /** Untuk `badge`: label per nilai. Untuk kolom yang nilainya id, halaman admin mengisinya dari data terkait. */
  labels?: Record<string, string>;
  labelsFrom?: string;
  className?: string;
};

export type EntityDef = {
  key: string;
  label: string;
  singular: string;
  description: string;
  publicPath?: string;
  fields: Field[];
  columns: Column[];
  /** Nilai awal form "tambah". */
  defaults: Record<string, unknown>;
  searchKeys: string[];
  canCreate?: boolean;
};

const ordering: Field[] = [
  { name: "sortOrder", label: "Urutan", type: "number", integer: true, half: true, help: "Angka kecil tampil lebih dulu." },
  { name: "active", label: "Tampilkan di situs", type: "switch", half: true },
];

const activeColumn: Column = { key: "active", label: "Tampil", type: "boolean" };

export const leadStatusLabels = { new: "Baru", contacted: "Dihubungi", done: "Selesai" };
export const leadTypeLabels = { registration: "Pendaftaran", coverage: "Cek area" };

export const entityDefs: EntityDef[] = [
  {
    key: "packages",
    label: "Paket Internet",
    singular: "paket",
    description: "Paket yang tampil di tab produk pada beranda.",
    publicPath: "/#produk-layanan",
    searchKeys: ["name", "speed", "price"],
    defaults: { speedLabel: "Fiber Optic", priceUnit: "/ bulan", ctaLabel: "Pilih Paket Ini", features: [], active: true, sortOrder: 0 },
    columns: [
      { key: "name", label: "Paket" },
      { key: "categoryId", label: "Kategori", type: "badge", labelsFrom: "packageCategories" },
      { key: "speed", label: "Kecepatan" },
      { key: "price", label: "Harga" },
      { key: "featured", label: "Unggulan", type: "boolean" },
      activeColumn,
    ],
    fields: [
      { name: "name", label: "Nama paket", type: "text", required: true, half: true },
      { name: "categoryId", label: "Kategori", type: "select", optionsFrom: "packageCategories", required: true, half: true },
      { name: "badge", label: "Label di atas kartu", type: "text", placeholder: "mis. Paling Populer" },
      { name: "description", label: "Deskripsi singkat", type: "textarea", rows: 2 },
      { name: "speed", label: "Kecepatan", type: "text", required: true, half: true, placeholder: "50 Mbps" },
      { name: "speedLabel", label: "Keterangan kecepatan", type: "text", half: true },
      { name: "price", label: "Harga", type: "text", required: true, half: true, placeholder: "Rp 375.000" },
      { name: "priceUnit", label: "Satuan harga", type: "text", half: true },
      { name: "features", label: "Fitur", type: "strings", itemLabel: "Fitur" },
      { name: "ctaLabel", label: "Teks tombol", type: "text", half: true },
      { name: "featured", label: "Tandai sebagai unggulan", type: "switch", half: true },
      ...ordering,
    ],
  },
  {
    key: "package-categories",
    label: "Kategori Paket",
    singular: "kategori",
    description: "Tab kategori di bagian paket (Rumah, Bisnis, Dedicated).",
    publicPath: "/#produk-layanan",
    searchKeys: ["name"],
    defaults: { icon: "home", active: true, sortOrder: 0 },
    columns: [{ key: "name", label: "Kategori" }, { key: "description", label: "Deskripsi", className: "max-w-80 truncate" }, activeColumn],
    fields: [
      { name: "name", label: "Nama kategori", type: "text", required: true, half: true },
      { name: "icon", label: "Ikon", type: "icon", half: true },
      { name: "description", label: "Deskripsi", type: "text" },
      ...ordering,
    ],
  },
  {
    key: "coverage-areas",
    label: "Titik Jangkauan",
    singular: "titik",
    description: "Titik jaringan pada peta Area Jangkauan.",
    publicPath: "/area-jangkauan",
    searchKeys: ["name", "city", "district"],
    defaults: { status: "active", radiusKm: 3, odpCount: 0, maxSpeed: "Hingga 1 Gbps", fiberAvailability: "100% Murni", active: true, sortOrder: 0 },
    columns: [
      { key: "name", label: "Area" },
      { key: "city", label: "Kota / Kabupaten" },
      { key: "status", label: "Status", type: "badge", labels: { active: "Aktif", expansion: "Ekspansi" } },
      { key: "radiusKm", label: "Radius (km)" },
      activeColumn,
    ],
    fields: [
      { name: "name", label: "Nama area", type: "text", required: true, placeholder: "Panakkukang & Pettarani" },
      { name: "city", label: "Kota / Kabupaten", type: "text", required: true, half: true },
      { name: "district", label: "Kecamatan", type: "text", half: true },
      {
        name: "status",
        label: "Status jaringan",
        type: "select",
        options: [
          { value: "active", label: "Jaringan aktif" },
          { value: "expansion", label: "Area ekspansi" },
        ],
      },
      {
        name: "location",
        label: "Lokasi di peta",
        type: "map",
        latField: "lat",
        lngField: "lng",
        radiusField: "radiusKm",
        help: "Klik peta untuk menaruh titik. Latitude dan longitude terisi otomatis; lingkaran menunjukkan radius jangkauan.",
      },
      { name: "lat", label: "Latitude", type: "number", required: true, half: true, help: "Terisi dari peta, atau salin dari Google Maps." },
      { name: "lng", label: "Longitude", type: "number", required: true, half: true },
      { name: "radiusKm", label: "Radius jangkauan (km)", type: "number", required: true, half: true, help: "Alamat di dalam radius ini dinyatakan terjangkau." },
      { name: "odpCount", label: "Jumlah ODP cluster", type: "number", integer: true, half: true },
      { name: "maxSpeed", label: "Kecepatan maksimal", type: "text", half: true },
      { name: "fiberAvailability", label: "Ketersediaan fiber", type: "text", half: true },
      { name: "note", label: "Catatan", type: "textarea", rows: 2 },
      ...ordering,
    ],
  },
  {
    key: "faqs",
    label: "FAQ",
    singular: "pertanyaan",
    description: "Pertanyaan di halaman Bantuan dan beranda.",
    publicPath: "/bantuan",
    searchKeys: ["question", "category"],
    defaults: { active: true, showOnHome: false, sortOrder: 0 },
    columns: [
      { key: "question", label: "Pertanyaan", className: "max-w-96 truncate" },
      { key: "category", label: "Kategori", type: "badge" },
      { key: "showOnHome", label: "Di beranda", type: "boolean" },
      activeColumn,
    ],
    fields: [
      { name: "question", label: "Pertanyaan", type: "text", required: true },
      { name: "answer", label: "Jawaban", type: "textarea", rows: 5, required: true },
      { name: "category", label: "Kategori", type: "select", optionsFrom: "faqCategories", half: true },
      { name: "showOnHome", label: "Tampil di beranda", type: "switch", half: true },
      ...ordering,
    ],
  },
  {
    key: "articles",
    label: "Artikel Berita",
    singular: "artikel",
    description: "Artikel di halaman Berita.",
    publicPath: "/berita",
    searchKeys: ["title", "category"],
    defaults: { status: "draft", readMinutes: 3, tags: [], publishDate: "" },
    columns: [
      { key: "coverUrl", label: "", type: "image" },
      { key: "title", label: "Judul", className: "max-w-96 truncate" },
      { key: "category", label: "Kategori", type: "badge" },
      { key: "publishDate", label: "Tanggal", type: "date" },
      { key: "status", label: "Status", type: "badge", labels: { draft: "Draf", published: "Terbit" } },
    ],
    fields: [
      { name: "title", label: "Judul", type: "text", required: true },
      { name: "slug", label: "Slug URL", type: "text", help: "Kosongkan agar dibuat otomatis dari judul." },
      { name: "category", label: "Kategori", type: "text", half: true, placeholder: "Perkembangan Jaringan" },
      { name: "publishDate", label: "Tanggal terbit", type: "date", required: true, half: true },
      { name: "excerpt", label: "Ringkasan", type: "textarea", rows: 3 },
      {
        name: "body",
        label: "Isi artikel",
        type: "textarea",
        rows: 14,
        help: "Pisahkan paragraf dengan satu baris kosong. Awali baris dengan “## ” untuk subjudul atau “- ” untuk butir daftar.",
      },
      { name: "coverUrl", label: "Gambar sampul", type: "image" },
      { name: "tags", label: "Tag", type: "strings", itemLabel: "Tag" },
      { name: "readMinutes", label: "Lama baca (menit)", type: "number", integer: true, half: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        half: true,
        options: [
          { value: "draft", label: "Draf" },
          { value: "published", label: "Terbit" },
        ],
      },
    ],
  },
  {
    key: "clients",
    label: "Klien & Mitra",
    singular: "klien",
    description: "Nama atau logo yang berjalan di bagian klien pada beranda.",
    publicPath: "/",
    searchKeys: ["name"],
    defaults: { active: true, sortOrder: 0 },
    columns: [{ key: "logoUrl", label: "", type: "image" }, { key: "name", label: "Nama" }, activeColumn],
    fields: [
      { name: "name", label: "Nama", type: "text", required: true },
      { name: "logoUrl", label: "Logo", type: "image", help: "Opsional. Jika kosong, nama ditampilkan sebagai teks." },
      ...ordering,
    ],
  },
  {
    key: "leads",
    label: "Prospek Masuk",
    singular: "prospek",
    description: "Kiriman formulir pendaftaran dan pengecekan area dari pengunjung.",
    searchKeys: ["name", "phone", "city", "address"],
    canCreate: false,
    defaults: {},
    columns: [
      { key: "name", label: "Nama" },
      { key: "type", label: "Jenis", type: "badge", labels: leadTypeLabels },
      { key: "phone", label: "WhatsApp", type: "whatsapp" },
      { key: "city", label: "Kota" },
      { key: "status", label: "Status", type: "badge", labels: leadStatusLabels },
      { key: "createdAt", label: "Masuk", type: "datetime" },
    ],
    fields: [
      { name: "name", label: "Nama", type: "text", required: true, half: true },
      { name: "phone", label: "WhatsApp", type: "text", required: true, half: true },
      {
        name: "type",
        label: "Jenis",
        type: "select",
        half: true,
        options: [
          { value: "registration", label: "Pendaftaran" },
          { value: "coverage", label: "Cek area" },
        ],
      },
      {
        name: "status",
        label: "Status tindak lanjut",
        type: "select",
        half: true,
        options: [
          { value: "new", label: "Baru" },
          { value: "contacted", label: "Dihubungi" },
          { value: "done", label: "Selesai" },
        ],
      },
      { name: "city", label: "Kota", type: "text", half: true },
      { name: "packageName", label: "Paket diminati", type: "text", half: true },
      { name: "address", label: "Alamat", type: "textarea", rows: 2 },
      { name: "need", label: "Kebutuhan", type: "text", half: true },
      { name: "source", label: "Sumber", type: "text", half: true },
      { name: "note", label: "Catatan internal", type: "textarea", rows: 3 },
    ],
  },
];

export const getEntityDef = (key: string) => entityDefs.find((entity) => entity.key === key);

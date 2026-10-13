import type { Field } from "./fields";

export type Column = {
  key: string;
  label: string;
  /** `proof`: gambar bukti transfer yang bisa dibuka layar penuh dan diunduh. */
  type?: "text" | "badge" | "boolean" | "image" | "proof" | "date" | "datetime" | "month" | "currency" | "whatsapp";
  /** Untuk `badge` dan teks: label per nilai. Untuk kolom yang nilainya id, halaman admin mengisinya dari data terkait. */
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
  /** Data internal: perubahannya tidak perlu menyegarkan halaman publik. */
  internal?: boolean;
  /** Bila diisi, baris tabel membuka halaman detail di `<detailPath>/<id>`. */
  detailPath?: string;
  /** Menampilkan tombol tiga titik yang membuka dialog berisi semua isian baris itu. */
  detailDialog?: boolean;
};

const ordering: Field[] = [
  { name: "sortOrder", label: "Urutan", type: "number", integer: true, half: true, help: "Angka kecil tampil lebih dulu." },
  { name: "active", label: "Tampilkan di situs", type: "switch", half: true },
];

const activeColumn: Column = { key: "active", label: "Tampil", type: "boolean" };

export const leadStatusLabels = { new: "Baru", contacted: "Dihubungi", done: "Selesai" };
export const leadTypeLabels = { registration: "Pendaftaran", coverage: "Cek area" };
export const customerStatusLabels: Record<string, string> = { active: "Aktif", inactive: "Belum aktif", suspended: "Suspend", relocation: "Relokasi" };
export const paymentStatusLabels: Record<string, string> = { paid: "Lunas", unpaid: "Belum lunas" };
export const clientTypeLabels: Record<string, string> = { partner: "Mitra", client: "Klien", cdn: "Cloud & CDN" };
/** Invoice memakai istilah yang tercetak di lembarnya. */
export const invoiceStatusLabels: Record<string, string> = { unpaid: "Unpaid", paid: "Paid" };

const toOptions = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

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
      { key: "status", label: "Status", type: "badge", labels: { active: "Aktif", inactive: "Belum aktif", installing: "Instalasi FO", expansion: "Ekspansi" } },
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
          { value: "inactive", label: "Jaringan belum aktif" },
          { value: "installing", label: "Proses instalasi kabel FO" },
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
    description: "Logo di beranda. Jenis menentukan deretannya: Mitra, Klien, atau Cloud & CDN Terhubung.",
    publicPath: "/",
    searchKeys: ["name"],
    defaults: { type: "client", active: true, sortOrder: 0 },
    columns: [
      { key: "logoUrl", label: "", type: "image" },
      { key: "name", label: "Nama" },
      { key: "type", label: "Jenis", type: "badge", labels: clientTypeLabels },
      activeColumn,
    ],
    fields: [
      { name: "name", label: "Nama", type: "text", required: true },
      { name: "type", label: "Jenis", type: "select", required: true, options: toOptions(clientTypeLabels), help: "Menentukan logo ini tampil di deretan mitra, klien, atau Cloud & CDN." },
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
  {
    key: "customers",
    label: "Data Pelanggan",
    singular: "pelanggan",
    description: "Data pelanggan untuk keperluan internal. Klik baris untuk membuka detail, foto, dan riwayat pembayaran.",
    searchKeys: ["name", "company", "phone", "siteId", "cid", "address", "regency", "ipAddress"],
    internal: true,
    detailPath: "/admin/data/customers",
    defaults: { status: "active", monthlyFee: "", napFee: "" },
    columns: [
      { key: "company", label: "PT" },
      { key: "name", label: "Nama" },
      { key: "siteId", label: "Site ID" },
      { key: "regency", label: "Kabupaten" },
      { key: "capacity", label: "Kapasitas" },
      { key: "monthlyFee", label: "Biaya ke ISP", type: "currency" },
      { key: "status", label: "Status", type: "badge", labels: customerStatusLabels },
    ],
    fields: [
      { name: "name", label: "Nama", type: "text", required: true, half: true },
      { name: "company", label: "PT", type: "text", half: true, placeholder: "Nama perusahaan" },
      { name: "phone", label: "No. telepon", type: "text", half: true },
      { name: "status", label: "Status layanan", type: "select", half: true, options: toOptions(customerStatusLabels) },
      { name: "siteId", label: "Site ID", type: "text", half: true },
      { name: "cid", label: "CID", type: "text", half: true },
      { name: "address", label: "Alamat lengkap", type: "textarea", rows: 3, placeholder: "Jalan, nomor rumah, RT/RW, kelurahan atau desa" },
      { name: "district", label: "Kecamatan", type: "text", half: true },
      { name: "regency", label: "Kabupaten", type: "text", half: true },
      { name: "province", label: "Provinsi", type: "text", half: true },
      { name: "capacity", label: "Kapasitas", type: "text", half: true, placeholder: "50 Mbps" },
      { name: "monthlyFee", label: "Biaya bulanan ke ISP (Rp)", type: "number", integer: true, half: true, help: "Yang dibayar pelanggan tiap bulan. Angka saja, tanpa titik." },
      { name: "napFee", label: "Biaya bulanan ke NAP (Rp)", type: "number", integer: true, half: true, help: "Yang dibayar ke NAP tiap bulan. Selisihnya tercatat di menu Selisih Keuntungan." },
      { name: "paymentNumber", label: "No. pembayaran", type: "text", half: true },
      { name: "vendor", label: "Vendor", type: "text", half: true },
      { name: "ipAddress", label: "IP address", type: "text", half: true },
      { name: "activationDate", label: "Tanggal aktivasi", type: "date", half: true },
      { name: "note", label: "Keterangan", type: "textarea", rows: 3 },
    ],
  },
  {
    key: "customer-payments",
    label: "History Pembayaran Subnet",
    singular: "pembayaran",
    description: "Riwayat pembayaran semua pelanggan. Pembayaran juga bisa dicatat dari halaman detail pelanggan.",
    searchKeys: ["period", "method", "note"],
    internal: true,
    detailDialog: true,
    defaults: { status: "paid", amount: "" },
    columns: [
      { key: "customerId", label: "Pelanggan", labelsFrom: "customerNames" },
      { key: "period", label: "Bulan", type: "month" },
      { key: "paidDate", label: "Tanggal bayar", type: "date" },
      { key: "amount", label: "Nominal", type: "currency" },
      { key: "method", label: "Metode" },
      { key: "status", label: "Status", type: "badge", labels: paymentStatusLabels },
      { key: "proofUrl", label: "Bukti", type: "proof" },
    ],
    fields: [
      { name: "customerId", label: "Pelanggan", type: "select", optionsFrom: "customers", required: true },
      { name: "period", label: "Bulan tagihan", type: "month", required: true, half: true },
      { name: "paidDate", label: "Tanggal bayar", type: "date", half: true },
      { name: "amount", label: "Nominal (Rp)", type: "number", integer: true, required: true, min: 1, half: true },
      { name: "method", label: "Metode", type: "text", half: true, placeholder: "Transfer BRI" },
      { name: "status", label: "Status", type: "select", half: true, options: toOptions(paymentStatusLabels) },
      { name: "proofUrl", label: "Bukti transfer", type: "image", help: "Opsional. Unggah foto atau tangkapan layar bukti transfer." },
      { name: "note", label: "Keterangan", type: "textarea", rows: 2 },
    ],
  },
  {
    key: "customer-purchases",
    label: "History Pembelian Perusahaan",
    singular: "pembelian",
    description: "Riwayat pembelian perusahaan ke pemasok. Pembelian yang dicatat dari halaman detail pelanggan ikut tampil di sini.",
    searchKeys: ["supplierName", "serviceName", "cid", "period", "method", "note"],
    internal: true,
    detailDialog: true,
    defaults: { status: "paid", amount: "" },
    columns: [
      { key: "supplierName", label: "Pemasok" },
      { key: "serviceName", label: "Layanan" },
      { key: "period", label: "Bulan", type: "month" },
      { key: "paidDate", label: "Tanggal bayar", type: "date" },
      { key: "amount", label: "Nominal", type: "currency" },
      { key: "method", label: "Metode" },
      { key: "status", label: "Status", type: "badge", labels: paymentStatusLabels },
      { key: "proofUrl", label: "Bukti", type: "proof" },
    ],
    fields: [
      { name: "supplierName", label: "Nama pemasok", type: "text", required: true },
      { name: "supplierAddress", label: "Alamat pemasok", type: "textarea", rows: 2 },
      { name: "supplierEmail", label: "Email pemasok", type: "email", half: true, placeholder: "nama@perusahaan.com" },
      { name: "serviceName", label: "Nama layanan", type: "text", half: true, placeholder: "IP Transit 100 Mbps" },
      { name: "cid", label: "CID", type: "text", half: true, help: "Circuit ID layanan dari pemasok." },
      { name: "period", label: "Bulan tagihan", type: "month", required: true, half: true },
      { name: "paidDate", label: "Tanggal bayar", type: "date", half: true, help: "Wajib diisi bila statusnya Lunas." },
      { name: "amount", label: "Nominal (Rp)", type: "number", integer: true, required: true, min: 1, half: true },
      { name: "method", label: "Metode pembayaran", type: "text", half: true, placeholder: "Transfer BRI" },
      { name: "status", label: "Status", type: "select", half: true, options: toOptions(paymentStatusLabels) },
      { name: "customerId", label: "Pelanggan terkait", type: "select", optionsFrom: "customers", half: true, help: "Opsional. Jika dipilih, pembelian ini juga tampil di halaman detail pelanggan itu." },
      { name: "proofUrl", label: "Bukti transfer", type: "image", help: "Opsional. Unggah foto atau tangkapan layar bukti transfer." },
      { name: "note", label: "Keterangan", type: "textarea", rows: 2 },
    ],
  },
  {
    key: "invoices",
    label: "Invoice",
    singular: "invoice",
    description: "Invoice untuk pelanggan. Klik baris untuk membuka invoice yang siap dicetak atau disimpan sebagai PDF.",
    searchKeys: ["number", "companyName", "customerCode", "pic"],
    internal: true,
    detailPath: "/admin/invoice",
    defaults: { status: "unpaid", items: [], notes: [], taxRate: "" },
    columns: [
      { key: "number", label: "No. Invoice" },
      { key: "companyName", label: "Pelanggan" },
      { key: "issueDate", label: "Tanggal terbit", type: "date" },
      { key: "dueDate", label: "Jatuh tempo", type: "date" },
      { key: "total", label: "Total tagihan", type: "currency" },
      { key: "status", label: "Status", type: "badge", labels: invoiceStatusLabels },
    ],
    fields: [
      {
        name: "customerId",
        label: "Pelanggan",
        type: "select",
        optionsFrom: "customers",
        help: "Opsional. Isian pelanggan dan layanan di bawah yang dikosongkan akan diisi dari data pelanggan ini saat disimpan.",
      },
      { name: "number", label: "No. invoice", type: "text", half: true, help: "Kosongkan agar dibuat otomatis." },
      { name: "status", label: "Status", type: "select", half: true, options: toOptions(invoiceStatusLabels) },
      { name: "issueDate", label: "Tanggal terbit", type: "date", half: true, help: "Kosong berarti hari ini." },
      { name: "dueDate", label: "Jatuh tempo", type: "date", half: true, help: "Kosong berarti 14 hari setelah terbit." },
      { name: "companyName", label: "Nama perusahaan", type: "text" },
      { name: "address", label: "Alamat", type: "textarea", rows: 2 },
      { name: "npwp", label: "NPWP", type: "text", half: true },
      { name: "pic", label: "PIC", type: "text", half: true },
      { name: "email", label: "Email", type: "email", half: true },
      { name: "phone", label: "No. telepon", type: "text", half: true },
      { name: "customerCode", label: "ID pelanggan", type: "text", half: true },
      { name: "contractNo", label: "No. kontrak", type: "text", half: true },
      { name: "serviceType", label: "Jenis layanan", type: "text", half: true, placeholder: "Dedicated Internet (Business)" },
      { name: "bandwidth", label: "Bandwidth", type: "text", half: true, placeholder: "200 Mbps" },
      { name: "location", label: "Lokasi", type: "text" },
      { name: "periodStart", label: "Periode tagihan mulai", type: "date", half: true },
      { name: "periodEnd", label: "Periode tagihan sampai", type: "date", half: true },
      {
        name: "items",
        label: "Item tagihan",
        type: "list",
        itemLabel: "Item",
        titleField: "description",
        help: "Bila kosong dan pelanggan dipilih, satu item dibuat dari biaya bulanan pelanggan itu.",
        fields: [
          { name: "description", label: "Deskripsi", type: "text", required: true },
          { name: "note", label: "Keterangan kecil", type: "text", placeholder: "Termasuk IP Public / Static IP 1x" },
          { name: "quantity", label: "Qty", type: "number", required: true, min: 1, half: true },
          { name: "unitPrice", label: "Harga satuan (Rp)", type: "number", integer: true, required: true, min: 0, half: true },
        ],
      },
      { name: "taxRate", label: "PPN (%)", type: "number", min: 0, half: true, help: "Kosong berarti memakai PPN bawaan di Pengaturan Invoice; isi 0 bila tanpa PPN." },
      { name: "notes", label: "Catatan", type: "strings", itemLabel: "Catatan", help: "Kosongkan untuk memakai catatan bawaan dari Pengaturan Invoice." },
    ],
  },
];

/** Entitas yang barisnya bisa ditautkan ke seorang pelanggan lewat `customerId`. */
export const customerHistoryKeys = ["customer-payments", "customer-purchases", "invoices"];

export const getEntityDef = (key: string) => entityDefs.find((entity) => entity.key === key);

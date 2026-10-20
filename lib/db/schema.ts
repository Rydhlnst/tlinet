import { sql } from "drizzle-orm";
import { bigint, boolean, date, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

const ordering = {
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
};

/** Dokumen konten per halaman (settings, home, coverage, help, about, news, register). */
export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const packageCategories = pgTable("package_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("home"),
  ...ordering,
  ...timestamps,
});

export const packages = pgTable("packages", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull(),
  name: text("name").notNull(),
  badge: text("badge").notNull().default(""),
  description: text("description").notNull().default(""),
  speed: text("speed").notNull(),
  speedLabel: text("speed_label").notNull().default("Fiber Optic"),
  price: text("price").notNull(),
  priceUnit: text("price_unit").notNull().default("/ bulan"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  ctaLabel: text("cta_label").notNull().default("Pilih Paket Ini"),
  ...ordering,
  ...timestamps,
});

export const faqs = pgTable("faqs", {
  id: text("id").primaryKey(),
  category: text("category").notNull().default(""),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  showOnHome: boolean("show_on_home").notNull().default(false),
  ...ordering,
  ...timestamps,
});

export const coverageAreas = pgTable("coverage_areas", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  district: text("district").notNull().default(""),
  city: text("city").notNull(),
  status: text("status").notNull().default("active"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radiusKm: doublePrecision("radius_km").notNull().default(3),
  odpCount: integer("odp_count").notNull().default(0),
  maxSpeed: text("max_speed").notNull().default(""),
  fiberAvailability: text("fiber_availability").notNull().default(""),
  note: text("note").notNull().default(""),
  ...ordering,
  ...timestamps,
});

export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull().default(""),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""),
  coverUrl: text("cover_url").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  readMinutes: integer("read_minutes").notNull().default(3),
  publishDate: date("publish_date").notNull(),
  status: text("status").notNull().default("draft"),
  ...timestamps,
});

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Deretan logo beranda tempat entri ini tampil: "partner", "client", atau "cdn". */
  type: text("type").notNull().default("client"),
  logoUrl: text("logo_url").notNull().default(""),
  ...ordering,
  ...timestamps,
});

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull().default(""),
    address: text("address").notNull().default(""),
    need: text("need").notNull().default(""),
    source: text("source").notNull().default(""),
    packageName: text("package_name").notNull().default(""),
    status: text("status").notNull().default("new"),
    note: text("note").notNull().default(""),
    ...timestamps,
  },
  (table) => [index("leads_status_created_idx").on(table.status, table.createdAt)],
);

/**
 * Data pelanggan untuk keperluan internal; tidak pernah tampil di situs publik.
 * Tanggal dan bulan disimpan sebagai teks ("YYYY-MM-DD", "YYYY-MM") karena boleh kosong.
 */
export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company").notNull().default(""),
    phone: text("phone").notNull().default(""),
    siteId: text("site_id").notNull().default(""),
    cid: text("cid").notNull().default(""),
    address: text("address").notNull().default(""),
    district: text("district").notNull().default(""),
    regency: text("regency").notNull().default(""),
    province: text("province").notNull().default(""),
    capacity: text("capacity").notNull().default(""),
    /** Tagihan bulanan pelanggan ke kita (ISP). Selisihnya dengan `napFee` adalah keuntungan per bulan. */
    monthlyFee: integer("monthly_fee").notNull().default(0),
    /** Biaya bulanan yang kita bayar ke NAP untuk pelanggan ini. */
    napFee: integer("nap_fee").notNull().default(0),
    paymentNumber: text("payment_number").notNull().default(""),
    vendor: text("vendor").notNull().default(""),
    ipAddress: text("ip_address").notNull().default(""),
    vlan: text("vlan").notNull().default(""),
    /** Dokumen AOS pelanggan (PDF atau gambar). */
    aosUrl: text("aos_url").notNull().default(""),
    /** Dokumen PKS (Perjanjian Kerja Sama) pelanggan; ikut tampil di portal Subnet. */
    pksUrl: text("pks_url").notNull().default(""),
    status: text("status").notNull().default("active"),
    activationDate: text("activation_date").notNull().default(""),
    /** Nama tower yang melayani pelanggan, mis. "Tower Gantarang Keke". */
    towerName: text("tower_name").notNull().default(""),
    /** Koordinat tower yang melayani pelanggan, tampil sebagai peta di portal Subnet. (0, 0) berarti belum diisi. */
    towerLat: doublePrecision("tower_lat").notNull().default(0),
    towerLng: doublePrecision("tower_lng").notNull().default(0),
    note: text("note").notNull().default(""),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    /** Terisi bila pelanggan ini berasal dari (atau ditautkan ke) pelanggan di Accurate Online. */
    accurateId: integer("accurate_id"),
    accurateNo: text("accurate_no").notNull().default(""),
    ...timestamps,
  },
  // Satu pelanggan Accurate hanya boleh ditautkan ke satu baris, agar impor ulang tidak menggandakan.
  (table) => [uniqueIndex("customers_accurate_id_idx").on(table.accurateId).where(sql`${table.accurateId} is not null`)],
);

/** Kolom tagihan bulanan yang sama-sama dipakai History Pembayaran Subnet dan History Pembelian Perusahaan. */
const billingColumns = () => ({
  period: text("period").notNull(),
  paidDate: text("paid_date").notNull().default(""),
  amount: integer("amount").notNull().default(0),
  method: text("method").notNull().default(""),
  status: text("status").notNull().default("paid"),
  /** Gambar bukti transfer; kosong bila belum diunggah. */
  proofUrl: text("proof_url").notNull().default(""),
  note: text("note").notNull().default(""),
  ...timestamps,
});

/**
 * Akun login portal Subnet (/subnet): satu per pelanggan, dibuat admin dari menu Subnet.
 * Email disimpan huruf kecil; kata sandi hanya disimpan sebagai hash scrypt.
 */
export const subnetAccounts = pgTable("subnet_accounts", {
  customerId: text("customer_id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  /** Foto profil yang diunggah pelanggan dari portal; juga dipasang sebagai foto pertama di Data Pelanggan. */
  photoUrl: text("photo_url").notNull().default(""),
  /** Port LibreNMS (MRTG) yang grafik trafiknya tampil di portal; dipilih admin di menu Subnet. */
  librenmsPortId: integer("librenms_port_id"),
  /** Atau: antrean QoS (Simple Queue MikroTik) di LibreNMS sebagai sumber grafik, bila pelanggan tidak punya port VLAN sendiri. */
  librenmsQosId: integer("librenms_qos_id"),
  librenmsQosDeviceId: integer("librenms_qos_device_id"),
  /** IP atau hostname yang dicek lewat ping.pe di portal; diisi admin di menu Subnet. */
  pingTarget: text("ping_target").notNull().default(""),
  /** Dibisukan admin di Forum Subnet: masih bisa membaca, tidak bisa mengirim pesan. */
  chatMuted: boolean("chat_muted").notNull().default(false),
  /** Terakhir pelanggan membuka Forum; pesan orang lain setelahnya dihitung belum dibaca (titik merah dan notifikasi). */
  forumReadAt: timestamp("forum_read_at"),
  ...timestamps,
});

/**
 * Pesan grup Forum Subnet: satu ruang obrolan untuk semua pelanggan Subnet dan admin. `customerId` kosong untuk
 * pesan admin (namanya di `authorName`). Pesan yang dihapus admin disimpan dengan `deletedAt` dan tidak lagi tampil.
 */
export const communityMessages = pgTable(
  "community_messages",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull().default(""),
    isAdmin: boolean("is_admin").notNull().default(false),
    body: text("body").notNull(),
    /** Gambar lampiran (sudah diperkecil di perangkat pengirim); kosong bila pesan hanya teks. */
    imageUrl: text("image_url").notNull().default(""),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("community_messages_created_idx").on(table.createdAt.desc())],
);

/** Pembayaran dari pelanggan (subnet) ke kita. */
export const customerPayments = pgTable(
  "customer_payments",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    /** Penanggung jawab pembayaran; diisi dari nama pelanggan bila dikosongkan. */
    pic: text("pic").notNull().default(""),
    /** Invoice asal pembayaran ini; kosong untuk pembayaran yang dicatat langsung. */
    invoiceId: text("invoice_id").notNull().default(""),
    ...billingColumns(),
  },
  (table) => [index("customer_payments_customer_idx").on(table.customerId, table.period)],
);

/**
 * Pembelian perusahaan ke pemasok. `customerId` kosong untuk pembelian umum; terisi bila pembelian itu
 * dicatat dari halaman detail seorang pelanggan, sehingga ikut tampil di sana.
 */
export const customerPurchases = pgTable(
  "customer_purchases",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull().default(""),
    supplierName: text("supplier_name").notNull().default(""),
    supplierAddress: text("supplier_address").notNull().default(""),
    supplierEmail: text("supplier_email").notNull().default(""),
    serviceName: text("service_name").notNull().default(""),
    /** Circuit ID layanan dari pemasok. */
    cid: text("cid").notNull().default(""),
    /** Site ID dan nomor pembayaran ke pemasok; diisi dari pelanggan terkait bila dikosongkan. */
    siteId: text("site_id").notNull().default(""),
    paymentNumber: text("payment_number").notNull().default(""),
    ba: text("ba").notNull().default(""),
    /** Invoice pelanggan yang memicu tagihan pemasok ini; kosong untuk pembelian yang dicatat langsung. */
    invoiceId: text("invoice_id").notNull().default(""),
    /** Bukti transfer ke pemasok (JPG/PNG). `proofUrl` pembelian berisi invoice dari pemasoknya. */
    transferProofUrl: text("transfer_proof_url").notNull().default(""),
    ...billingColumns(),
  },
  (table) => [index("customer_purchases_customer_idx").on(table.customerId, table.period)],
);

/** Karyawan perusahaan, dasar pencatatan gaji bulanan. Gaji pokok dan tunjangan di sini jadi isian awal slip gajinya. */
export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  accountHolder: text("account_holder").notNull().default(""),
  joinDate: text("join_date").notNull().default(""),
  baseSalary: integer("base_salary").notNull().default(0),
  allowance: integer("allowance").notNull().default(0),
  status: text("status").notNull().default("active"),
  note: text("note").notNull().default(""),
  ...timestamps,
});

/**
 * Gaji karyawan per bulan. `amount` (gaji bersih) dihitung server: gaji pokok + tunjangan + lembur + bonus − potongan.
 * `position` adalah jabatan saat itu, supaya riwayat lama tidak berubah ketika jabatannya berganti.
 */
export const salaryPayments = pgTable(
  "salary_payments",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id").notNull().default(""),
    position: text("position").notNull().default(""),
    baseSalary: integer("base_salary").notNull().default(0),
    allowance: integer("allowance").notNull().default(0),
    overtime: integer("overtime").notNull().default(0),
    bonus: integer("bonus").notNull().default(0),
    deduction: integer("deduction").notNull().default(0),
    ...billingColumns(),
  },
  (table) => [index("salary_payments_employee_idx").on(table.employeeId, table.period)],
);

export type InvoiceItem = { description: string; note: string; quantity: number; unitPrice: number };

/**
 * Invoice yang dibuat dari dashboard. Data pelanggan disalin ke invoice saat dibuat, sehingga invoice lama
 * tidak berubah ketika data pelanggannya diubah. `total` disimpan agar bisa ditampilkan di daftar.
 */
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  number: text("number").notNull().unique(),
  status: text("status").notNull().default("unpaid"),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  customerId: text("customer_id").notNull().default(""),
  companyName: text("company_name").notNull(),
  address: text("address").notNull().default(""),
  npwp: text("npwp").notNull().default(""),
  pic: text("pic").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  customerCode: text("customer_code").notNull().default(""),
  contractNo: text("contract_no").notNull().default(""),
  serviceType: text("service_type").notNull().default(""),
  bandwidth: text("bandwidth").notNull().default(""),
  location: text("location").notNull().default(""),
  periodStart: text("period_start").notNull().default(""),
  periodEnd: text("period_end").notNull().default(""),
  items: jsonb("items").$type<InvoiceItem[]>().notNull().default([]),
  taxRate: doublePrecision("tax_rate").notNull().default(0),
  total: bigint("total", { mode: "number" }).notNull().default(0),
  notes: jsonb("notes").$type<string[]>().notNull().default([]),
  ...timestamps,
});

/** `data` hanya terisi (base64) bila R2 belum diatur; saat itu `url` menunjuk ke /media/<id>. */
export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull().default(0),
  data: text("data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Satu langkah progres yang sudah selesai: waktunya, siapa yang menandai, dan catatan opsional. */
export type MetroStepRecord = { at: string; by: string; note?: string };

/**
 * Progres Metro: pemasangan baru atau upgrade kapasitas satu pelanggan, ditampilkan di portal Subnet supaya pelanggan
 * tahu prosesnya sudah sampai mana. Langkah-langkahnya ada di lib/metro.ts; yang selesai dicatat di `steps`.
 */
export const metroOrders = pgTable(
  "metro_orders",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    /** "install" (pemasangan baru) atau "upgrade". */
    kind: text("kind").notNull(),
    /** Kapasitas yang dipasang atau diminta, mis. "200 Mbps". */
    capacity: text("capacity").notNull().default(""),
    /** Kapasitas sebelum upgrade, dicatat saat permintaan dibuat. */
    previousCapacity: text("previous_capacity").notNull().default(""),
    steps: jsonb("steps").$type<Record<string, MetroStepRecord>>().notNull().default({}),
    /** Catatan dari pelanggan saat mengajukan upgrade. */
    note: text("note").notNull().default(""),
    /** "active", "done", atau "rejected". */
    status: text("status").notNull().default("active"),
    rejectReason: text("reject_reason").notNull().default(""),
    ...timestamps,
  },
  (table) => [index("metro_orders_customer_idx").on(table.customerId, table.createdAt)],
);

/**
 * Akun staf dashboard (di bawah owner yang diatur lewat ADMIN_EMAIL). Tiap akun hanya membuka menu yang ada di
 * `permissions` (lihat lib/permissions.ts). Bukan tabel `admin_users` lama yang masih tertinggal di database.
 */
export const staffUsers = pgTable("staff_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  ...timestamps,
});

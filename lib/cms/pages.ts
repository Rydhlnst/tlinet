import type { ContentKey } from "@/lib/content/types";
import type { Field, Section } from "./fields";

export type PageDef = {
  key: ContentKey;
  label: string;
  description: string;
  /** Halaman publik yang menampilkan konten ini. */
  publicPath: string;
  sections: Section[];
};

const head: Field[] = [
  { name: "eyebrow", label: "Label kecil", type: "text", half: true },
  { name: "title", label: "Judul", type: "text", required: true },
  { name: "description", label: "Deskripsi", type: "textarea", rows: 3 },
];

const heroPlain: Field[] = [
  { name: "title", label: "Judul", type: "text", required: true },
  { name: "description", label: "Deskripsi", type: "textarea", rows: 3 },
];

const linkList = (name: string, label: string, itemLabel: string, help?: string): Field => ({
  name,
  label,
  help,
  type: "list",
  itemLabel,
  titleField: "label",
  fields: [
    { name: "label", label: "Teks", type: "text", required: true, half: true },
    { name: "href", label: "Tautan", type: "url", required: true, half: true },
  ],
});

const iconCards = (name: string, label: string, itemLabel: string, extra: Field[] = []): Field => ({
  name,
  label,
  type: "list",
  itemLabel,
  titleField: "title",
  fields: [
    { name: "icon", label: "Ikon", type: "icon", half: true },
    { name: "title", label: "Judul", type: "text", required: true, half: true },
    { name: "description", label: "Deskripsi", type: "textarea", rows: 2 },
    ...extra,
  ],
});

/** Tombol pembuka kisi logo; hanya muncul bila logonya cukup banyak untuk berjalan. */
const logoButtons: Field[] = [
  { name: "moreLabel", label: "Teks tombol lihat semua", type: "text", half: true },
  { name: "lessLabel", label: "Teks tombol tutup", type: "text", half: true },
];

const accent: Field = {
  name: "titleAccent",
  label: "Bagian judul yang diberi gradasi biru",
  type: "text",
  help: "Harus persis sama dengan sebagian teks judul. Kosongkan bila tidak perlu.",
};

const cta: Field[] = [
  { name: "ctaLabel", label: "Teks tombol", type: "text", half: true },
  { name: "ctaHref", label: "Tautan tombol", type: "url", half: true },
];

export const pageDefs: PageDef[] = [
  {
    key: "home",
    label: "Beranda",
    description: "Hero, keunggulan, judul bagian paket, langkah berlangganan, dan bagian lain di halaman utama.",
    publicPath: "/",
    sections: [
      {
        path: "hero",
        title: "Hero",
        description: "Bagian paling atas halaman utama.",
        fields: [
          { name: "badge", label: "Label kecil", type: "text" },
          { name: "title", label: "Judul utama (baris pertama)", type: "text", required: true },
          { name: "titleAccent", label: "Judul baris kedua (bergradasi biru)", type: "text" },
          { name: "description", label: "Deskripsi", type: "textarea", rows: 3 },
          { name: "primaryLabel", label: "Tombol utama", type: "text", half: true },
          { name: "primaryHref", label: "Tautan tombol utama", type: "url", half: true },
          { name: "secondaryLabel", label: "Tombol kedua", type: "text", half: true },
          { name: "secondaryHref", label: "Tautan tombol kedua", type: "url", half: true },
          {
            name: "imageUrl",
            label: "Gambar latar hero",
            type: "image",
            help: "Foto lebar (16:9 atau lebih lebar). Sisi kiri digelapkan untuk teks, jadi objek utama sebaiknya di kanan. Jika kosong, latar biru malam dengan animasi jaringan.",
          },
          {
            name: "stats",
            label: "Angka statistik",
            type: "list",
            itemLabel: "Statistik",
            titleField: "label",
            fields: [
              { name: "icon", label: "Ikon", type: "icon" },
              { name: "value", label: "Angka", type: "text", required: true, half: true },
              { name: "label", label: "Keterangan", type: "text", required: true, half: true },
            ],
          },
          iconCards("segments", "Kartu segmen pelanggan", "Segmen", [{ name: "href", label: "Tautan", type: "url" }]),
        ],
      },
      {
        path: "features",
        title: "Keunggulan",
        fields: [...head, iconCards("items", "Daftar keunggulan", "Keunggulan")],
      },
      {
        path: "packages",
        title: "Bagian paket",
        description: "Daftar paketnya sendiri diatur di menu Paket Internet.",
        fields: [...head, { name: "note", label: "Catatan kaki", type: "text" }],
      },
      {
        path: "why",
        title: "Kualitas jaringan",
        fields: [
          ...head,
          accent,
          ...cta,
          {
            name: "items",
            label: "Angka keunggulan",
            type: "list",
            itemLabel: "Angka",
            titleField: "title",
            fields: [
              { name: "icon", label: "Ikon", type: "icon" },
              { name: "imageUrl", label: "Ilustrasi", type: "image", help: "Opsional. Gambar berlatar putih/terang di sudut kanan atas kartu; kosongkan untuk memakai ilustrasi bawaan." },
              { name: "value", label: "Angka", type: "text", required: true, half: true },
              { name: "title", label: "Judul", type: "text", required: true, half: true },
              { name: "description", label: "Deskripsi", type: "textarea", rows: 2 },
            ],
          },
        ],
      },
      {
        path: "steps",
        title: "Cara berlangganan",
        description: "Ilustrasi kartu mengikuti urutan langkah: lokasi, paket, lalu router.",
        fields: [
          ...head,
          { name: "titleAccent", label: "Kata dalam judul yang diberi gradasi biru", type: "text", help: "Harus persis sama dengan bagian judul, mis. Berlangganan." },
          ...cta,
          {
            name: "items",
            label: "Langkah",
            type: "list",
            itemLabel: "Langkah",
            titleField: "title",
            fields: [
              { name: "title", label: "Judul", type: "text", required: true },
              { name: "description", label: "Deskripsi", type: "textarea", rows: 2 },
              { name: "ctaLabel", label: "Teks tombol", type: "text", half: true },
              { name: "ctaHref", label: "Tautan tombol", type: "url", half: true },
            ],
          },
        ],
      },
      {
        path: "news",
        title: "Bagian berita",
        description: "Menampilkan tiga artikel terbit terbaru. Artikelnya diatur di menu Artikel Berita.",
        fields: [...head, accent, ...cta],
      },
      {
        path: "faq",
        title: "Bagian FAQ",
        description: "Pertanyaan yang tampil diatur di menu FAQ (opsi “Tampil di beranda”).",
        fields: [
          ...head,
          accent,
          ...cta,
          { name: "helpTitle", label: "Judul kartu bantuan", type: "text", half: true, help: "Kartu ini membuka chat WhatsApp." },
          { name: "helpDescription", label: "Keterangan kartu bantuan", type: "text", half: true },
        ],
      },
      {
        path: "partners",
        title: "Bagian mitra & klien",
        description: "Judul besar, label kecil, dan deskripsi tampil di samping bola jaring. Kolom Judul menjadi label deretan logo mitra (menu Klien & Mitra, jenis Mitra).",
        fields: [
          { name: "headline", label: "Judul besar, baris pertama", type: "text", half: true },
          { name: "headlineAccent", label: "Judul besar, baris kedua (biru)", type: "text", half: true },
          ...head,
          ...logoButtons,
        ],
      },
      {
        path: "clients",
        title: "Deretan klien",
        description: "Judul ini menjadi label deretan logo klien (menu Klien & Mitra, jenis Klien).",
        fields: [head[1], ...logoButtons],
      },
      {
        path: "cdn",
        title: "Deretan Cloud & CDN",
        description: "Judul ini menjadi label deretan logo ketiga (menu Klien & Mitra, jenis Cloud & CDN).",
        fields: [head[1], ...logoButtons],
      },
    ],
  },
  {
    key: "coverage",
    label: "Area Jangkauan",
    description: "Teks halaman peta jangkauan dan formulir pengecekan. Titik jaringan diatur di menu Titik Jangkauan.",
    publicPath: "/area-jangkauan",
    sections: [
      { path: "hero", title: "Hero", fields: head },
      {
        path: "map",
        title: "Peta",
        fields: [
          { name: "searchPlaceholder", label: "Teks kolom pencarian", type: "text" },
          { name: "locateLabel", label: "Tombol lokasi saya", type: "text", half: true },
          { name: "regionsLabel", label: "Label daftar wilayah", type: "text", half: true },
          { name: "activeLabel", label: "Legenda jaringan aktif", type: "text", half: true },
          { name: "inactiveLabel", label: "Legenda jaringan belum aktif", type: "text", half: true },
          { name: "installingLabel", label: "Legenda proses instalasi kabel FO", type: "text", half: true },
          { name: "expansionLabel", label: "Legenda area ekspansi", type: "text", half: true },
          { name: "myLocationLabel", label: "Legenda lokasi saya", type: "text", half: true },
          { name: "signupLabel", label: "Tombol daftar pada kartu area", type: "text", half: true },
          { name: "clickHint", label: "Petunjuk cek lokasi", type: "text" },
          { name: "coveredText", label: "Hasil cek: lokasi terjangkau", type: "textarea", rows: 2 },
          { name: "installingText", label: "Hasil cek: proses instalasi kabel FO", type: "textarea", rows: 2 },
          { name: "expansionText", label: "Hasil cek: area ekspansi", type: "textarea", rows: 2 },
          { name: "inactiveText", label: "Hasil cek: jaringan belum aktif", type: "textarea", rows: 2 },
          { name: "outsideText", label: "Hasil cek: belum terjangkau", type: "textarea", rows: 2 },
          { name: "centerLat", label: "Titik tengah peta (latitude)", type: "number", half: true },
          { name: "centerLng", label: "Titik tengah peta (longitude)", type: "number", half: true },
          { name: "zoom", label: "Zoom awal (5–15)", type: "number", integer: true, half: true },
        ],
      },
      {
        path: "form",
        title: "Formulir pengecekan",
        fields: [
          ...head,
          { name: "submitLabel", label: "Teks tombol kirim", type: "text" },
          { name: "cities", label: "Pilihan kota / kabupaten", type: "strings", itemLabel: "Kota" },
          { name: "needs", label: "Pilihan kebutuhan internet", type: "strings", itemLabel: "Kebutuhan" },
        ],
      },
    ],
  },
  {
    key: "help",
    label: "Bantuan",
    description: "Hero, kartu pintasan, dan kategori FAQ di halaman Bantuan.",
    publicPath: "/bantuan",
    sections: [
      { path: "hero", title: "Hero", fields: heroPlain },
      {
        path: "",
        title: "Kartu pintasan",
        fields: [
          iconCards("quickLinks", "Pintasan", "Pintasan", [
            {
              name: "href",
              label: "Tautan",
              type: "url",
              help: "Isi “whatsapp” untuk membuka chat WhatsApp, atau “#faq” untuk menuju daftar pertanyaan.",
            },
          ]),
        ],
      },
      {
        path: "faq",
        title: "Bagian FAQ",
        fields: [
          { name: "title", label: "Judul", type: "text", required: true },
          { name: "description", label: "Deskripsi", type: "textarea", rows: 2 },
          { name: "allLabel", label: "Label “semua kategori”", type: "text" },
          {
            name: "categories",
            label: "Kategori FAQ",
            type: "strings",
            itemLabel: "Kategori",
            help: "Kategori ini menjadi pilihan saat mengisi FAQ.",
          },
        ],
      },
    ],
  },
  {
    key: "about",
    label: "Tentang Kami",
    description: "Profil perusahaan, visi, misi, dan nilai utama.",
    publicPath: "/tentang-kami",
    sections: [
      { path: "hero", title: "Hero", fields: heroPlain },
      {
        path: "who",
        title: "Siapa kami",
        fields: [
          { name: "eyebrow", label: "Label kecil", type: "text", half: true },
          { name: "title", label: "Judul", type: "text", required: true },
          accent,
          { name: "body", label: "Isi", type: "textarea", rows: 7, help: "Pisahkan paragraf dengan satu baris kosong." },
          iconCards("features", "Keunggulan singkat", "Keunggulan"),
          {
            name: "highlights",
            label: "Sorotan",
            type: "list",
            itemLabel: "Sorotan",
            titleField: "title",
            fields: [
              { name: "icon", label: "Ikon", type: "icon" },
              { name: "title", label: "Judul", type: "text", required: true, half: true },
              { name: "description", label: "Keterangan", type: "text", half: true },
            ],
          },
          { name: "imageUrl", label: "Gambar", type: "image", help: "Opsional. Jika kosong, ditampilkan peta jaringan Sulawesi." },
          { name: "cardTitle", label: "Judul panel pada kartu peta", type: "text" },
          { name: "cardDescription", label: "Deskripsi panel pada kartu peta", type: "textarea", rows: 2 },
          { name: "bannerTitle", label: "Judul kartu bawah", type: "text", half: true },
          { name: "bannerDescription", label: "Keterangan kartu bawah", type: "text", half: true },
          { name: "bannerHref", label: "Tautan kartu bawah", type: "url" },
        ],
      },
      {
        path: "vision",
        title: "Visi",
        fields: [
          { name: "title", label: "Judul", type: "text", required: true },
          { name: "body", label: "Isi", type: "textarea", rows: 4 },
        ],
      },
      {
        path: "mission",
        title: "Misi",
        fields: [
          { name: "title", label: "Judul", type: "text", required: true },
          { name: "items", label: "Butir misi", type: "strings", itemLabel: "Misi" },
        ],
      },
      { path: "values", title: "Nilai utama", fields: [...head, iconCards("items", "Daftar nilai", "Nilai")] },
    ],
  },
  {
    key: "news",
    label: "Berita",
    description: "Teks halaman daftar berita dan ajakan di halaman artikel. Artikelnya diatur di menu Artikel Berita.",
    publicPath: "/berita",
    sections: [
      { path: "hero", title: "Hero", fields: heroPlain },
      {
        path: "",
        title: "Daftar berita",
        fields: [
          { name: "readMoreLabel", label: "Teks tautan baca", type: "text", half: true },
          { name: "relatedTitle", label: "Judul artikel terkait", type: "text", half: true },
          { name: "emptyText", label: "Teks saat belum ada berita", type: "text" },
        ],
      },
      {
        path: "articleCta",
        title: "Ajakan di halaman artikel",
        fields: [
          { name: "title", label: "Judul", type: "text", required: true },
          { name: "description", label: "Deskripsi", type: "textarea", rows: 3 },
          { name: "buttonLabel", label: "Teks tombol", type: "text" },
        ],
      },
    ],
  },
  {
    key: "register",
    label: "Formulir Registrasi",
    description: "Teks dan pilihan pada halaman pendaftaran.",
    publicPath: "/formulir-registrasi",
    sections: [
      { path: "hero", title: "Hero", fields: head },
      {
        path: "form",
        title: "Formulir",
        fields: [
          { name: "title", label: "Judul formulir", type: "text", required: true },
          { name: "submitLabel", label: "Teks tombol kirim", type: "text" },
          { name: "note", label: "Catatan di bawah tombol", type: "textarea", rows: 2 },
          { name: "emailNote", label: "Kalimat alternatif email", type: "text", help: "Alamat email dari Pengaturan ditambahkan di belakangnya." },
          { name: "sources", label: "Pilihan “mengetahui dari mana”", type: "strings", itemLabel: "Pilihan" },
        ],
      },
    ],
  },
  {
    key: "settings",
    label: "Pengaturan Situs",
    description: "Identitas merek, kontak, navigasi, footer, dan ajakan yang tampil di semua halaman.",
    publicPath: "/",
    sections: [
      {
        path: "",
        title: "Identitas",
        fields: [
          { name: "brandName", label: "Nama merek", type: "text", required: true, half: true },
          { name: "brandHighlight", label: "Bagian nama berwarna biru", type: "text", half: true, help: "Akhiran nama merek yang diwarnai, mis. NET pada TLINET." },
          { name: "tagline", label: "Tagline", type: "text" },
          { name: "logoUrl", label: "Logo", type: "image", help: "Opsional. Jika kosong, lambang dan nama merek ditampilkan sebagai teks." },
          { name: "seoTitle", label: "Judul SEO", type: "text", required: true },
          { name: "seoDescription", label: "Deskripsi SEO", type: "textarea", rows: 2 },
        ],
      },
      {
        path: "",
        title: "Kontak",
        fields: [
          { name: "address", label: "Alamat", type: "textarea", rows: 2 },
          { name: "phone", label: "Telepon", type: "text", half: true },
          { name: "email", label: "Email", type: "text", half: true },
          {
            name: "whatsappNumber",
            label: "Nomor WhatsApp (Customer Service)",
            type: "text",
            required: true,
            half: true,
            help: "Tombol WhatsApp di situs dan \"Customer Service\" di portal Subnet. Format internasional tanpa tanda +, mis. 6281234567890.",
          },
          { name: "whatsappMessage", label: "Pesan WhatsApp bawaan", type: "textarea", rows: 2 },
          {
            name: "itSupportWhatsapp",
            label: "WhatsApp IT Support Jaringan",
            type: "text",
            half: true,
            help: "Portal Subnet: kontak IT Support Jaringan dan tujuan Lapor Gangguan. Format internasional tanpa tanda +.",
          },
          {
            name: "metroWhatsapp",
            label: "WhatsApp Progres Metro",
            type: "text",
            half: true,
            help: "Portal Subnet: pertanyaan soal progres pemasangan dan upgrade. Format internasional tanpa tanda +.",
          },
        ],
      },
      {
        path: "",
        title: "Navigasi",
        fields: [
          linkList("navLinks", "Menu utama", "Menu"),
          { name: "navCtaLabel", label: "Tombol di header", type: "text", half: true },
          { name: "navCtaHref", label: "Tautan tombol header", type: "url", half: true },
        ],
      },
      {
        path: "",
        title: "Footer",
        fields: [
          { name: "footerDescription", label: "Deskripsi singkat", type: "textarea", rows: 3 },
          linkList("footerServices", "Kolom layanan", "Tautan"),
          linkList("footerLegal", "Tautan bawah", "Tautan"),
          linkList("socialLinks", "Media sosial", "Akun"),
        ],
      },
      {
        path: "cta",
        title: "Ajakan penutup",
        description: "Blok ajakan yang tampil di bagian bawah halaman publik.",
        fields: [
          ...head,
          { name: "primaryLabel", label: "Tombol utama", type: "text", half: true },
          { name: "primaryHref", label: "Tautan tombol utama", type: "url", half: true },
          { name: "secondaryLabel", label: "Tombol WhatsApp", type: "text", half: true },
        ],
      },
    ],
  },
  {
    key: "invoice",
    label: "Pengaturan Invoice",
    description: "Identitas perusahaan, rekening pembayaran, dan catatan yang tercetak di setiap invoice.",
    publicPath: "/admin/data/invoices",
    sections: [
      {
        path: "",
        title: "Perusahaan",
        fields: [
          { name: "companyName", label: "Nama perusahaan", type: "text", required: true },
          { name: "companyTagline", label: "Keterangan di bawah nama", type: "text" },
          { name: "logoUrl", label: "Logo", type: "image", help: "Tampil di pojok kiri atas invoice. Pakai gambar berlatar putih." },
          { name: "address", label: "Alamat", type: "textarea", rows: 4, help: "Satu alamat per baris." },
          { name: "phone", label: "Telepon", type: "text", half: true },
          { name: "email", label: "Email", type: "email", half: true },
          { name: "website", label: "Situs web", type: "text", half: true },
        ],
      },
      {
        path: "",
        title: "Dokumen",
        fields: [
          { name: "title", label: "Judul dokumen", type: "text", required: true, half: true },
          { name: "subtitle", label: "Keterangan di bawah judul", type: "text", half: true },
          { name: "taxRate", label: "PPN bawaan (%)", type: "number", min: 0, half: true, help: "Dipakai invoice baru. Tiap invoice bisa mengubahnya; isi 0 bila tanpa PPN." },
          { name: "footerTagline", label: "Slogan di baris paling bawah", type: "text", half: true },
        ],
      },
      {
        path: "",
        title: "Pembayaran",
        description: "Blok Informasi Pembayaran hanya tercetak bila nama bank dan nomor rekening diisi.",
        fields: [
          { name: "bankName", label: "Nama bank", type: "text", half: true, placeholder: "Bank BRI" },
          { name: "bankAccountNumber", label: "No. rekening", type: "text", half: true },
          { name: "bankAccountHolder", label: "Atas nama", type: "text" },
          { name: "qrUrl", label: "Gambar QR pembayaran", type: "image", help: "Opsional, mis. QRIS. Jika kosong, QR tidak dicetak." },
          { name: "qrCaption", label: "Keterangan QR", type: "text" },
        ],
      },
      {
        path: "",
        title: "Tanda tangan",
        description: "Tercetak di bawah Informasi Pembayaran. Kosongkan gambarnya bila invoice tidak perlu tanda tangan.",
        fields: [
          { name: "signatureUrl", label: "QR atau gambar tanda tangan", type: "image", help: "Mis. QR tanda tangan elektronik Direktur." },
          { name: "signatureName", label: "Nama penanda tangan", type: "text", half: true, help: "Opsional." },
          { name: "signatureTitle", label: "Jabatan", type: "text", half: true, placeholder: "Direktur" },
        ],
      },
      {
        path: "",
        title: "Catatan",
        fields: [{ name: "notes", label: "Catatan bawaan", type: "strings", itemLabel: "Catatan", help: "Tercetak bernomor di setiap invoice yang catatannya dikosongkan." }],
      },
    ],
  },
];

export const getPageDef = (key: string) => pageDefs.find((page) => page.key === key);

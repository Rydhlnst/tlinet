/** Data awal koleksi: diisi `npm run db:seed` ke tabel kosong, dan dipakai situs publik bila database belum diatur. */

export const seedPackageCategories = [
  { id: "cat-home", name: "Internet Rumah", description: "Untuk streaming 4K, belajar, gaming, & keluarga", icon: "home", sortOrder: 1, active: true },
  { id: "cat-business", name: "Internet Bisnis", description: "Untuk kantor, toko, restoran, hotel, & usaha", icon: "building", sortOrder: 2, active: true },
  { id: "cat-dedicated", name: "Internet Dedicated", description: "Enterprise 1:1 murni dengan SLA 99.9%", icon: "server", sortOrder: 3, active: true },
];

const pkg = { speedLabel: "Fiber Optic", priceUnit: "/ bulan", ctaLabel: "Pilih Paket Ini", featured: false, active: true, badge: "" };

export const seedPackages = [
  {
    ...pkg,
    id: "pkg-home-30",
    categoryId: "cat-home",
    name: "Fiber Home 30",
    description: "Ideal untuk keluarga kecil, browsing, media sosial, dan streaming HD.",
    speed: "30 Mbps",
    price: "Rp 250.000",
    features: [
      "Kecepatan s/d 30 Mbps",
      "Kuota Unlimited (Tanpa FUP)",
      "Rasio Upload & Download 1:1",
      "Satu Wi-Fi Router Modern Included",
      "Free Biaya Pemasangan*",
      "Support Pelanggan 24/7",
    ],
    sortOrder: 1,
  },
  {
    ...pkg,
    id: "pkg-home-50",
    categoryId: "cat-home",
    name: "Fiber Home 50",
    badge: "Paling Populer",
    featured: true,
    description: "Cocok untuk keluarga aktif, kerja dari rumah, video conference, & streaming 4K.",
    speed: "50 Mbps",
    price: "Rp 375.000",
    features: [
      "Kecepatan s/d 50 Mbps",
      "Kuota Unlimited (Tanpa FUP)",
      "Rasio Upload & Download 1:1",
      "Wi-Fi 6 Router Dual Band",
      "Free Biaya Pemasangan*",
      "Prioritas Dukungan Teknis 24/7",
    ],
    sortOrder: 2,
  },
  {
    ...pkg,
    id: "pkg-home-100",
    categoryId: "cat-home",
    name: "Fiber Home 100",
    description: "Performa maksimal untuk gamer, content creator, dan smart home banyak perangkat.",
    speed: "100 Mbps",
    price: "Rp 599.000",
    features: [
      "Kecepatan s/d 100 Mbps",
      "Kuota Unlimited (Tanpa FUP)",
      "Rasio Ultra Low Latency",
      "Wi-Fi 6 Gaming Router Included",
      "Free Biaya Pemasangan",
      "Dukungan VIP Support Line",
    ],
    sortOrder: 3,
  },
  {
    ...pkg,
    id: "pkg-biz-starter",
    categoryId: "cat-business",
    name: "Business Starter",
    badge: "Untuk UMKM & Cafe",
    description: "Internet stabil throughput tinggi untuk kantor cabang, toko, cafe & resto.",
    speed: "100 Mbps",
    price: "Rp 1.200.000",
    features: [
      "Kecepatan 100 Mbps Symmetric",
      "Dedicated Bandwidth Ratio 1:2",
      "Static IP Public IPv4 (1 IP)",
      "SLA Guarantee 99.5%",
      "Managed Wi-Fi Router",
      "Support Helpdesk 24/7 & Technical Onsite",
    ],
    sortOrder: 1,
  },
  {
    ...pkg,
    id: "pkg-biz-pro",
    categoryId: "cat-business",
    name: "Business Pro",
    badge: "Rekomendasi Kantoran",
    featured: true,
    description: "Koneksi bisnis prima untuk operasional perkantoran medium & hotel.",
    speed: "300 Mbps",
    price: "Rp 2.800.000",
    features: [
      "Kecepatan 300 Mbps Symmetric",
      "Dedicated Bandwidth Ratio 1:1",
      "Static IP Public IPv4 Included",
      "SLA Guarantee 99.8%",
      "Enterprise Grade Router",
      "Dedicated Account Manager",
    ],
    sortOrder: 2,
  },
  {
    ...pkg,
    id: "pkg-dedicated",
    categoryId: "cat-dedicated",
    name: "Enterprise Dedicated",
    badge: "Enterprise SLA 99.9%",
    featured: true,
    description: "Koneksi internet dedicated fiber optic murni tanpa pembagian bandwidth.",
    speed: "Up to 1 Gbps",
    price: "Custom Quote",
    priceUnit: "/ contract",
    features: [
      "Custom Bandwidth 100 Mbps – 10 Gbps",
      "Strict 1:1 Dedicated Bandwidth",
      "Redundant Metro-Ethernet Fiber Ring",
      "Multi IP Public Subnet /29",
      "SLA Premium 99.9% with Credit Compensation",
      "24/7 NOC Monitoring & Direct Eng Escalation",
    ],
    sortOrder: 1,
  },
];

export const seedFaqs = [
  {
    id: "faq-1",
    category: "Koneksi & Fiber",
    question: "Apa saja jenis paket internet yang disediakan TLINET?",
    answer:
      "TLINET menyediakan paket Fiber Home untuk kebutuhan rumah tangga (30-100 Mbps), Fiber Business untuk UMKM & perkantoran (100-300 Mbps), serta Enterprise Dedicated Internet hingga 1 Gbps+ dengan jaminan SLA 99.9%.",
    showOnHome: true,
  },
  {
    id: "faq-2",
    category: "Koneksi & Fiber",
    question: "Apakah jaringan TLINET murni menggunakan 100% Fiber Optic?",
    answer:
      "Ya, seluruh jaringan utama (backbone) hingga jaringan akses terakhir ke rumah pelanggan (FTTH - Fiber to the Home) menggunakan teknologi kabel Fiber Optic berkualitas tinggi tanpa campuran kabel tembaga.",
    showOnHome: true,
  },
  {
    id: "faq-3",
    category: "Area Jangkauan",
    question: "Bagaimana cara mengecek ketersediaan jaringan di area rumah/lokasi saya?",
    answer:
      "Anda dapat mengunjungi halaman Area Jangkauan di website kami, memilih kota/kabupaten Anda, atau langsung mengisi form Cek Area via WhatsApp agar tim teknisi kami melakukan verifikasi lokasi secara akurat.",
    showOnHome: true,
  },
  {
    id: "faq-4",
    category: "Instalasi & Pemasangan",
    question: "Berapa lama proses pemasangan & instalasi jaringan?",
    answer:
      "Proses instalasi standar membutuhkan waktu 1 hingga 2 hari kerja setelah pendaftaran disetujui, tergantung jadwal teknisi dan kondisi jalur jaringan di lokasi Anda.",
    showOnHome: true,
  },
  {
    id: "faq-5",
    category: "Instalasi & Pemasangan",
    question: "Apakah ada promo gratis biaya pemasangan (free instalasi)?",
    answer:
      "Ya! Kami sering menghadirkan promo Free Biaya Pemasangan untuk berlangganan paket Fiber Home minimal 6 atau 12 bulan. Hubungi WhatsApp Customer Support kami untuk info promo aktif bulan ini.",
    showOnHome: true,
  },
  {
    id: "faq-6",
    category: "Pembayaran & Tagihan",
    question: "Metode pembayaran apa saja yang didukung untuk tagihan bulanan?",
    answer:
      "Kami mendukung berbagai metode pembayaran fleksibel: Transfer Bank (BCA, Mandiri, BRI, BNI), Virtual Account, E-Wallet (Gopay, OVO, Dana, ShopeePay), serta pembayaran kasir di Indomaret & Alfamart.",
    showOnHome: false,
  },
  {
    id: "faq-7",
    category: "Laporan Gangguan",
    question: "Bagaimana jika terjadi kendala teknis atau gangguan koneksi?",
    answer:
      "Tim Helpdesk & Network Operations Center (NOC) kami siap membantu Anda 24 jam sehari 7 hari seminggu. Anda dapat menghubungi Customer Service via WhatsApp, Telepon Call Center, atau ticketing di portal bantuan.",
    showOnHome: false,
  },
].map((faq, index) => ({ ...faq, sortOrder: index + 1, active: true }));

const area = { status: "active", maxSpeed: "Hingga 1 Gbps", fiberAvailability: "100% Murni", active: true };
const expansion = { status: "expansion", maxSpeed: "Hingga 300 Mbps", fiberAvailability: "Dalam pembangunan", odpCount: 0, active: true };

export const seedCoverageAreas = [
  { ...area, id: "area-panakkukang", name: "Panakkukang & Pettarani", district: "Kec. Panakkukang", city: "Makassar", lat: -5.1436, lng: 119.4489, radiusKm: 4, odpCount: 248, note: "100% Fiber FTTH Ultra Fast Ready & Business Center" },
  { ...area, id: "area-tamalanrea", name: "Tamalanrea & Kampus Unhas", district: "Kec. Tamalanrea", city: "Makassar", lat: -5.1332, lng: 119.4886, radiusKm: 3.5, odpCount: 176, note: "Siap untuk hunian, kos, dan kawasan kampus." },
  { ...area, id: "area-rappocini", name: "Rappocini & Alauddin", district: "Kec. Rappocini", city: "Makassar", lat: -5.1711, lng: 119.4347, radiusKm: 3, odpCount: 162, note: "Jaringan FTTH padat untuk perumahan dan ruko." },
  { ...area, id: "area-tanjung-bunga", name: "Tanjung Bunga & CPI", district: "Kec. Tamalate", city: "Makassar", lat: -5.1783, lng: 119.394, radiusKm: 3.5, odpCount: 134, note: "Tersedia paket rumah, bisnis, dan dedicated." },
  { ...area, id: "area-sungguminasa", name: "Sungguminasa", district: "Kec. Somba Opu", city: "Gowa", lat: -5.2101, lng: 119.453, radiusKm: 4, odpCount: 118, note: "FTTH ready untuk perumahan Gowa dan sekitarnya." },
  { ...area, id: "area-maros", name: "Maros Kota", district: "Kec. Turikale", city: "Maros", lat: -5.0055, lng: 119.5736, radiusKm: 4, odpCount: 86, note: "Mencakup pusat kota dan koridor bandara." },
  { ...area, id: "area-parepare", name: "Parepare Kota", district: "Kec. Ujung", city: "Parepare", lat: -4.0135, lng: 119.6255, radiusKm: 4.5, odpCount: 94, note: "Jaringan aktif di pusat kota dan kawasan pelabuhan." },
  { ...area, id: "area-sidrap", name: "Pangkajene Sidenreng", district: "Kec. Maritengngae", city: "Sidrap", lat: -3.9333, lng: 119.7833, radiusKm: 3.5, odpCount: 52, note: "FTTH ready untuk hunian dan pertokoan." },
  { ...area, id: "area-palopo", name: "Palopo Kota", district: "Kec. Wara", city: "Palopo", lat: -2.9925, lng: 120.1969, radiusKm: 4, odpCount: 71, note: "Melayani pusat kota Palopo dan sekitarnya." },
  { ...area, id: "area-bone", name: "Watampone", district: "Kec. Tanete Riattang", city: "Bone", lat: -4.5386, lng: 120.3279, radiusKm: 4, odpCount: 64, note: "Jaringan aktif di pusat kota Watampone." },
  { ...area, id: "area-bulukumba", name: "Bulukumba Kota", district: "Kec. Ujung Bulu", city: "Bulukumba", lat: -5.5544, lng: 120.1963, radiusKm: 3.5, odpCount: 48, note: "FTTH ready untuk perumahan dan usaha." },
  { ...expansion, id: "area-toraja", name: "Makale & Rantepao", district: "Kec. Makale", city: "Toraja", lat: -3.1036, lng: 119.8519, radiusKm: 5, note: "Pembangunan jaringan sedang berjalan. Daftar untuk masuk antrean pemasangan." },
  { ...expansion, id: "area-pinrang", name: "Pinrang Kota", district: "Kec. Watang Sawitto", city: "Pinrang", lat: -3.7936, lng: 119.6521, radiusKm: 4, note: "Target aktif pada tahap ekspansi berikutnya." },
  { ...expansion, id: "area-sinjai", name: "Sinjai Kota", district: "Kec. Sinjai Utara", city: "Sinjai", lat: -5.1241, lng: 120.253, radiusKm: 4, note: "Survei jalur fiber sedang berlangsung." },
].map((item, index) => ({ ...item, sortOrder: index + 1 }));

export const seedArticles = [
  {
    id: "article-1",
    slug: "ekspansi-jaringan-fiber-optic-sulawesi-2026",
    title: "TLINET Perluas Jangkauan Fiber Optic di 6 Provinsi Sulawesi",
    category: "Perkembangan Jaringan",
    excerpt:
      "Sebagai komitmen menghadirkan konektivitas cepat dan inklusif, TLINET resmi memperluas ribuan titik node kabel fiber optic ke area pemukiman baru di Makassar, Manado, dan Kendari.",
    body: [
      "TLINET terus memperkuat posisinya sebagai penyedia layanan internet fiber terdepan di Indonesia Timur dengan mengumumkan perluasan infrastruktur kabel jaringan fiber optic di 6 provinsi di pulau Sulawesi.",
      "Proyek ekspansi kuartal pertama tahun 2026 ini menambah lebih dari 200 titik distribusi node baru di area permukiman, kawasan bisnis, dan sentra UMKM di kota Makassar, Manado, Palu, Kendari, Gorontalo, dan Mamuju.",
      "Director of Network Infrastructure TLINET menyampaikan bahwa perluasan ini dirancang untuk menjawab tingginya kebutuhan masyarakat Sulawesi akan koneksi internet berkecepatan tinggi yang stabil dan tanpa batasan kuota (unlimited).",
      "Selain meningkatkan cakupan wilayah, TLINET juga melakukan upgrading kapasitas backbone antarkota menggunakan teknologi DWDM terbaru untuk menjamin latensi ultra-rendah dan stabilitas koneksi hingga 99.9%.",
    ].join("\n\n"),
    coverUrl: "",
    tags: ["Fiber Optic", "Sulawesi", "Ekspansi", "Infrastruktur"],
    readMinutes: 3,
    publishDate: "2026-03-10",
    status: "published",
  },
  {
    id: "article-2",
    slug: "tips-memilih-paket-internet-rumah-keluarga",
    title: "Tips Memilih Kecepatan Paket Internet yang Tepat untuk Kebutuhan Rumah Tangga",
    category: "Panduan & Edukasi",
    excerpt:
      "Panduan praktis menghitung kebutuhan bandwidth keluarga Anda agar aktivitas streaming 4K, video conference, dan online gaming berjalan mulus tanpa buffering.",
    body: [
      "Memilih paket internet rumah sering kali terasa membingungkan. Terlalu kecil membuat aktivitas tersendat, terlalu besar membuat anggaran bulanan terbuang. Kuncinya adalah menghitung kebutuhan nyata seluruh anggota keluarga.",
      "## Hitung jumlah perangkat dan aktivitasnya",
      "- Browsing dan media sosial: sekitar 3–5 Mbps per perangkat.",
      "- Video conference HD: sekitar 5–8 Mbps per perangkat.",
      "- Streaming 4K: sekitar 20–25 Mbps per layar.",
      "- Gaming online: bandwidth kecil, tetapi butuh latensi rendah dan koneksi stabil.",
      "## Rekomendasi sederhana",
      "Keluarga kecil dengan 3–5 perangkat umumnya nyaman di 30 Mbps. Keluarga aktif yang bekerja dan belajar dari rumah sebaiknya memilih 50 Mbps. Untuk gamer, content creator, atau rumah dengan banyak perangkat smart home, 100 Mbps memberi ruang yang lega.",
      "Karena jaringan fiber optic memberikan rasio upload dan download yang seimbang, kegiatan seperti mengunggah video atau mencadangkan foto ke cloud juga terasa jauh lebih cepat.",
    ].join("\n\n"),
    coverUrl: "",
    tags: ["Tips", "Internet Rumah", "Bandwidth"],
    readMinutes: 4,
    publishDate: "2026-03-02",
    status: "published",
  },
  {
    id: "article-3",
    slug: "solusi-dedicated-internet-untuk-sektor-bisnis-sulawesi",
    title: "Mengapa Bisnis & Perhotelan di Sulawesi Membutuhkan Dedicated Internet 1:1",
    category: "Teknologi & Bisnis",
    excerpt:
      "Pelajari bagaimana jaringan Dedicated Fiber Optic dengan jaminan SLA 99.9% membantu meningkatkan efisiensi operasional industri perkantoran, resort, dan resto di Sulawesi.",
    body: [
      "Bagi bisnis, koneksi internet bukan lagi fasilitas pelengkap. Sistem kasir, reservasi online, CCTV cloud, hingga rapat daring bergantung pada jaringan yang selalu tersedia.",
      "## Apa itu dedicated 1:1?",
      "Pada layanan dedicated, bandwidth yang Anda beli tidak dibagi dengan pelanggan lain. Kecepatan upload dan download sama besar serta konsisten sepanjang hari, termasuk pada jam sibuk.",
      "## Manfaat untuk operasional",
      "- Jaminan SLA 99.9% dengan kompensasi bila target tidak tercapai.",
      "- IP publik statis untuk server, VPN kantor cabang, dan sistem keamanan.",
      "- Pemantauan NOC 24/7 dan eskalasi langsung ke engineer.",
      "- Jalur fiber redundan sehingga layanan tetap berjalan saat salah satu jalur terganggu.",
      "Hotel dan resort merasakan dampaknya secara langsung: tamu mendapat Wi-Fi yang stabil di setiap kamar, sementara tim operasional tetap bisa memakai sistem manajemen properti tanpa hambatan.",
    ].join("\n\n"),
    coverUrl: "",
    tags: ["Dedicated", "Bisnis", "SLA"],
    readMinutes: 5,
    publishDate: "2026-02-22",
    status: "published",
  },
];

export const seedClients = [
  "Bosowa Group",
  "Kalla Holding",
  "Siloam Hospitals",
  "Grand Maleo Hotel",
  "Pelindo Makassar",
  "Kendari Industrial",
  "Bank Sulteng",
  "Celebes Media Tower",
  "Toraja Highlands",
  "Sam Ratulangi Airport",
].map((name, index) => ({ id: `client-${index + 1}`, name, logoUrl: "", sortOrder: index + 1, active: true }));

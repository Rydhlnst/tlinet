import type { ContentMap } from "./types";

/** Konten bawaan: dipakai `npm run db:seed` dan sebagai cadangan untuk field yang belum tersimpan. */
export const defaultContent: ContentMap = {
  settings: {
    brandName: "TLINET",
    brandHighlight: "NET",
    tagline: "Internet Cepat, Tanpa Batas",
    logoUrl: "",
    seoTitle: "TLINET — Internet Cepat, Tanpa Batas",
    seoDescription:
      "Koneksi fiber optic ultra cepat, stabil, dan tanpa batas untuk rumah, bisnis, hingga enterprise di seluruh Sulawesi.",
    navLinks: [
      { label: "Beranda", href: "/" },
      { label: "Produk / Layanan", href: "/#produk-layanan" },
      { label: "Area Jangkauan", href: "/area-jangkauan" },
      { label: "Bantuan", href: "/bantuan" },
      { label: "Tentang Kami", href: "/tentang-kami" },
      { label: "Berita", href: "/berita" },
    ],
    navCtaLabel: "Daftar Sekarang",
    navCtaHref: "/formulir-registrasi",
    footerDescription:
      "Penyedia layanan internet fiber optic ultra cepat, stabil, dan terpercaya untuk rumah, UMKM, perkantoran, dan kebutuhan profesional di seluruh kawasan Sulawesi.",
    footerServices: [
      { label: "Internet Rumah (FTTH)", href: "/#produk-layanan" },
      { label: "Internet Bisnis & UMKM", href: "/#produk-layanan" },
      { label: "Enterprise Dedicated Fiber", href: "/#produk-layanan" },
      { label: "Cek Ketersediaan Jaringan", href: "/area-jangkauan" },
    ],
    footerLegal: [
      { label: "Syarat & Ketentuan", href: "/bantuan" },
      { label: "Kebijakan Privasi", href: "/bantuan" },
      { label: "Jaringan Sulawesi", href: "/area-jangkauan" },
    ],
    socialLinks: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "Facebook", href: "https://facebook.com" },
    ],
    address: "BTN Rindra 4, Paenre Lompoe, Kecamatan Gantarang, Kabupaten Bulukumba, Sulawesi Selatan 92561",
    phone: "+62 823-2000-3007",
    email: "noc@translinkinternasional.com",
    whatsappNumber: "6282320003007",
    whatsappMessage: "Halo TLINET, saya mau bertanya mengenai layanan internet fiber.",
    cta: {
      eyebrow: "Koneksi Tercepat di Sulawesi",
      title: "Siap Upgrade Koneksi Internet Anda?",
      description:
        "Nikmati kecepatan fiber optic murni, koneksi tanpa lag, dan layanan pelanggan responsif 24 jam. Cek ketersediaan di lokasi Anda sekarang.",
      primaryLabel: "Cek Area Jangkauan",
      primaryHref: "/area-jangkauan",
      secondaryLabel: "Hubungi via WhatsApp",
    },
  },

  home: {
    hero: {
      badge: "Internet Fiber Optic Sulawesi",
      title: "Internet Cepat",
      titleAccent: "untuk Semua Kebutuhan",
      description:
        "Nikmati koneksi fiber optic ultra cepat, stabil, dan tanpa batas untuk rumah, bisnis, hingga enterprise di seluruh Sulawesi.",
      primaryLabel: "Cek Ketersediaan",
      primaryHref: "/area-jangkauan",
      secondaryLabel: "Hubungi Kami",
      secondaryHref: "/bantuan",
      imageUrl: "/images/hero-bg.jpg",
      stats: [
        { icon: "gauge", value: "1 Gbps", label: "Kecepatan Hingga" },
        { icon: "shield", value: "99.9%", label: "Uptime Jaringan" },
        { icon: "headset", value: "24/7", label: "Dukungan Responsif" },
        { icon: "globe", value: "100%", label: "Fiber Optic" },
      ],
      segments: [
        { icon: "home", title: "Rumah", description: "Internet stabil untuk seluruh keluarga", href: "/#produk-layanan" },
        { icon: "building", title: "Bisnis", description: "Mendukung produktivitas tanpa hambatan", href: "/#produk-layanan" },
        { icon: "factory", title: "Industri", description: "Solusi konektivitas untuk kebutuhan industri", href: "/#produk-layanan" },
        { icon: "tower", title: "Korporasi & Pemerintah", description: "Jaringan andal untuk skala besar", href: "/#produk-layanan" },
      ],
    },
    features: {
      eyebrow: "Internet Fiber Optic",
      title: "Cepat, Stabil, dan Siap Menemani Aktivitas Anda",
      description:
        "Dirancang khusus untuk menghadirkan pengalaman internet berkelas dunia bagi seluruh masyarakat Sulawesi.",
      items: [
        {
          icon: "zap",
          title: "Kecepatan Tinggi",
          description:
            "Nikmati koneksi berkecepatan tinggi untuk streaming 4K, gaming online, dan meeting video online.",
        },
        {
          icon: "shield",
          title: "Koneksi Stabil & Andal",
          description:
            "Infrastruktur jaringan 100% fiber optic murni dirancang untuk memberikan koneksi konsisten minim gangguan.",
        },
        {
          icon: "infinity",
          title: "Tanpa Batas (Unlimited)",
          description:
            "Bebas berselancar internet tanpa khawatir Fair Usage Policy (FUP) atau batasan penurunan kecepatan.",
        },
        {
          icon: "headset",
          title: "Dukungan Responsif 24/7",
          description:
            "Tim teknisi profesional dan customer service lokal di Sulawesi siap membantu permasalahan Anda 24 jam.",
        },
      ],
    },
    packages: {
      eyebrow: "Pilihan Paket Terbaik",
      title: "Internet untuk Rumah, Bisnis, dan Lebih Banyak Lagi",
      description: "Pilih paket internet fiber optic yang disesuaikan dengan skala kebutuhan dan budget Anda.",
      note: "*Syarat dan ketentuan berlaku. Harga belum termasuk PPN 11%.",
    },
    why: {
      eyebrow: "Kualitas Tanpa Kompromi",
      title: "Semua yang Anda Butuhkan untuk Koneksi Lebih Baik",
      titleAccent: "Koneksi Lebih Baik",
      description:
        "Didukung oleh teknologi jaringan tercanggih, kami hadir untuk menjamin setiap detik aktivitas digital Anda berjalan tanpa hambatan.",
      ctaLabel: "Pelajari Infrastruktur Kami",
      ctaHref: "/tentang-kami",
      items: [
        {
          icon: "zap",
          value: "100%",
          title: "Fiber Optic Murni",
          description: "Koneksi kabel FTTH murni hingga ke lokasi Anda tanpa tembaga.",
        },
        {
          icon: "shield",
          value: "99.9%",
          title: "Network Uptime",
          description: "Jaminan keandalan koneksi jaringan berkat redundant backbone.",
        },
        {
          icon: "headset",
          value: "24/7",
          title: "Dukungan Support",
          description: "Tim teknis siaga 24 jam nonstop siap membantu masalah Anda.",
        },
        {
          icon: "map-pin",
          value: "6 Prov",
          title: "Cakupan Sulawesi",
          description: "Jangkauan jaringan meluas di Sulawesi Selatan, Utara, Tengah, dll.",
        },
      ],
    },
    steps: {
      eyebrow: "Proses Mudah & Cepat",
      title: "Cara Berlangganan",
      titleAccent: "Berlangganan",
      description: "Terhubung dengan jaringan internet berkecepatan tinggi hanya dalam 3 langkah sederhana.",
      ctaLabel: "Cek Area Ketersediaan Sekarang",
      ctaHref: "/area-jangkauan",
      items: [
        {
          title: "Cek Area",
          description: "Pastikan alamat rumah atau bisnis Anda sudah terjangkau jaringan fiber optic TLINET.",
          ctaLabel: "Cek Ketersediaan",
          ctaHref: "/area-jangkauan",
        },
        {
          title: "Pilih Paket",
          description:
            "Pilih paket internet rumah, bisnis, atau dedicated yang paling pas dengan anggaran & kebutuhan Anda.",
          ctaLabel: "Lihat Paket",
          ctaHref: "/#produk-layanan",
        },
        {
          title: "Nikmati Internet",
          description: "Tim teknisi kami datang membantu proses instalasi hingga jaringan siap digunakan sepenuhnya.",
          ctaLabel: "Mulai Sekarang",
          ctaHref: "/formulir-registrasi",
        },
      ],
    },
    news: {
      eyebrow: "Berita & Informasi",
      title: "Informasi Terbaru Seputar TLINET",
      titleAccent: "Seputar TLINET",
      description: "Informasi terkini mengenai teknologi fiber optic, perkembangan jaringan di Sulawesi, dan tips digital.",
      ctaLabel: "Lihat Semua Berita",
      ctaHref: "/berita",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Pertanyaan yang Sering Ditanyakan",
      titleAccent: "Sering Ditanyakan",
      helpTitle: "Butuh Bantuan?",
      helpDescription: "Tim kami siap membantu Anda 24/7",
      description: "Jawaban lengkap untuk pertanyaan paling populer mengenai layanan kami.",
      ctaLabel: "Lihat Semua Pertanyaan di Bantuan",
      ctaHref: "/bantuan",
    },
    partners: {
      eyebrow: "Partnership & Clients",
      title: "Our Partnership",
      description: "TLINET terhubung dengan mitra jaringan nasional dan dipercaya instansi serta perusahaan di Sulawesi.",
      moreLabel: "See More",
      lessLabel: "Show Less",
    },
    clients: {
      eyebrow: "",
      title: "Our Clients",
      description: "",
      moreLabel: "See More",
      lessLabel: "Show Less",
    },
  },

  coverage: {
    hero: {
      eyebrow: "Peta Jangkauan Sulsel",
      title: "Cek Area Jangkauan Anda Sekarang!",
      description:
        "Dapatkan lokasi Anda atau pilih titik jaringan interaktif di bawah ini untuk mengecek ketersediaan jaringan FTTH murni di alamat Anda.",
    },
    map: {
      searchPlaceholder: "Cari kecamatan, kota, atau area di Sulsel (cth: Panakkukang, Gowa, Parepare)…",
      locateLabel: "Dapatkan Lokasi Saya",
      regionsLabel: "Wilayah Jangkauan Sulsel",
      activeLabel: "Jaringan Aktif (FTTH Ready)",
      inactiveLabel: "Jaringan Belum Aktif",
      installingLabel: "Proses Instalasi Kabel FO",
      expansionLabel: "Area Ekspansi (Q4 2026)",
      myLocationLabel: "Lokasi Saya (Terdeteksi)",
      signupLabel: "Daftar Pemasangan di Lokasi Ini",
      clickHint: "Klik titik mana pun pada peta, atau gunakan tombol lokasi, untuk mengecek alamat Anda.",
      coveredText: "Lokasi Anda berada di dalam jangkauan jaringan. Anda bisa langsung mendaftar pemasangan.",
      installingText: "Lokasi Anda berada di area yang sedang dalam proses instalasi kabel fiber optic. Daftar sekarang agar diprioritaskan saat jaringan aktif.",
      expansionText: "Lokasi Anda berada di area ekspansi. Daftar sekarang untuk masuk antrean pemasangan.",
      inactiveText: "Jaringan di lokasi Anda belum aktif. Kirim formulir di bawah agar tim kami mengabari saat layanan tersedia.",
      outsideText: "Lokasi Anda belum terjangkau jaringan. Kirim formulir di bawah agar tim kami memverifikasi permintaan Anda.",
      centerLat: -4.2,
      centerLng: 119.95,
      zoom: 8,
    },
    form: {
      eyebrow: "Formulir Pengecekan",
      title: "Cek Ketersediaan via WhatsApp",
      description:
        "Isi formulir di bawah ini. Tim kami akan langsung memverifikasi lokasi jaringan rumah/kantor Anda secara instan.",
      submitLabel: "Cek Ketersediaan via WhatsApp",
      cities: [
        "Makassar",
        "Gowa",
        "Maros",
        "Parepare",
        "Sidrap",
        "Palopo",
        "Bone",
        "Bulukumba",
        "Toraja",
        "Pinrang",
        "Sinjai",
        "Lainnya di Sulawesi",
      ],
      needs: ["Internet Rumah (Keluarga)", "Internet Bisnis / Cafe / Kantor", "Enterprise Dedicated 1:1"],
    },
  },

  help: {
    hero: {
      title: "Bagaimana Kami Bisa Membantu?",
      description:
        "Temukan jawaban langsung atau hubungi tim customer service TLINET untuk bantuan profesional.",
    },
    quickLinks: [
      {
        icon: "activity",
        title: "Cek Gangguan",
        description: "Laporkan masalah koneksi & cek status jaringan NOC.",
        href: "whatsapp",
      },
      {
        icon: "message",
        title: "Hubungi WhatsApp",
        description: "Chat langsung dengan customer support 24 jam.",
        href: "whatsapp",
      },
      {
        icon: "help",
        title: "Pertanyaan Umum",
        description: "Temukan jawaban atas masalah yang sering ditanyakan.",
        href: "#faq",
      },
      {
        icon: "wallet",
        title: "Panduan Pembayaran",
        description: "Info metode pembayaran tagihan & Virtual Account.",
        href: "#faq",
      },
    ],
    faq: {
      title: "Kategori Bantuan FAQ",
      description: "Pilih kategori untuk mempermudah pencarian solusi.",
      allLabel: "Semua Pertanyaan",
      categories: [
        "Koneksi & Fiber",
        "Instalasi & Pemasangan",
        "Pembayaran & Tagihan",
        "Laporan Gangguan",
        "Area Jangkauan",
      ],
    },
  },

  about: {
    hero: {
      title: "Menghubungkan Sulawesi dengan Internet yang Lebih Baik",
      description:
        "TLINET lahir dari tekad untuk memberdayakan masyarakat, pendidikan, UMKM, dan industri di Sulawesi melalui jaringan fiber optic berkualitas tinggi.",
    },
    who: {
      eyebrow: "Siapa Kami",
      title: "Penyedia Internet Fiber Terpercaya Berpusat di Sulawesi",
      titleAccent: "Fiber Terpercaya",
      features: [
        { icon: "zap", title: "Koneksi Cepat", description: "Stabil & Handal" },
        { icon: "shield", title: "Jaringan Aman", description: "Kualitas Terjaga" },
        { icon: "users", title: "Tim Lokal", description: "Siap Membantu" },
        { icon: "settings", title: "Solusi Lengkap", description: "Rumah, Bisnis & Industri" },
      ],
      body: "TLINET merupakan penyedia jasa layanan internet (ISP) berbasis fiber optic yang beroperasi penuh di wilayah Sulawesi, Indonesia. Kami berfokus menghadirkan koneksi cepat, stabil, dan terjangkau untuk hunian rumah tangga, tempat usaha, perkantoran, dan kawasan industri.\n\nDidukung oleh tim engineer berpengalaman dan infrastruktur backbone modern, kami berdedikasi membangun jaringan digital Sulawesi yang dapat diandalkan setiap saat.",
      highlights: [
        { icon: "signal", title: "100% FTTH", description: "Fiber to the Home" },
        { icon: "headset", title: "24/7 Helpdesk", description: "Dukungan Lokal" },
      ],
      imageUrl: "",
      cardTitle: "Infrastruktur Digital Sulawesi",
      cardDescription:
        "Jaringan Fiber Backbone terhubung di Makassar, Manado, Palu, Kendari, Gorontalo & Mamuju.",
      bannerTitle: "Membangun Sulawesi Lebih Terkoneksi",
      bannerDescription: "Internet untuk masa depan yang lebih baik",
      bannerHref: "/area-jangkauan",
    },
    vision: {
      title: "Visi Perusahaan",
      body: "Menjadi penyedia konektivitas digital terpercaya utama yang memberdayakan masyarakat dan mendorong akselerasi pertumbuhan ekonomi digital di Sulawesi melalui akses internet fiber yang ultra cepat dan andal.",
    },
    mission: {
      title: "Misi Perusahaan",
      items: [
        "Membangun jaringan fiber optic berkualitas tinggi dan tahan cuaca.",
        "Memberikan pelayanan pelanggan yang responsif, ramah, dan cepat tanggap.",
        "Memperluas akses internet ke pelosok area perumahan dan sentra bisnis Sulawesi.",
        "Menghadirkan inovasi teknologi jaringan terkini yang relevan dengan masa depan.",
      ],
    },
    values: {
      eyebrow: "Prinsip Utama",
      title: "Nilai-Nilai Utama Kami",
      description: "",
      items: [
        {
          icon: "zap",
          title: "Kecepatan",
          description: "Komitmen memberikan throughput internet tinggi berteknologi fiber optic murni.",
        },
        {
          icon: "shield",
          title: "Keandalan",
          description: "Stabilitas jaringan dengan redundant backbone dan SLA terjamin.",
        },
        {
          icon: "headset",
          title: "Pelayanan",
          description: "Dukungan tim helpdesk dan teknisi lokal 24/7 yang responsif dan ramah.",
        },
        {
          icon: "sparkles",
          title: "Inovasi",
          description: "Terus memperbarui teknologi jaringan dengan standar global tercanggih.",
        },
      ],
    },
  },

  news: {
    hero: {
      title: "Berita & Informasi",
      description:
        "Informasi terbaru seputar TLINET, teknologi fiber optic, perkembangan jaringan di Sulawesi, dan tips digital.",
    },
    readMoreLabel: "Baca Selengkapnya",
    emptyText: "Belum ada berita yang diterbitkan.",
    articleCta: {
      title: "Tertarik Berlangganan TLINET?",
      description:
        "Konsultasikan kebutuhan internet fiber untuk rumah atau bisnis Anda di Sulawesi secara langsung dengan spesialis layanan kami.",
      buttonLabel: "Chat via WhatsApp",
    },
    relatedTitle: "Artikel Terkait",
  },

  register: {
    hero: {
      eyebrow: "Pendaftaran",
      title: "Daftar TLINET",
      description:
        "Isi formulir di bawah ini dan tim kami akan menghubungi Anda untuk mengonfirmasi ketersediaan dan menjadwalkan instalasi.",
    },
    form: {
      title: "Informasi Anda",
      submitLabel: "Kirim via WhatsApp",
      note: "Anda akan diarahkan ke WhatsApp untuk mengirim pendaftaran Anda. Tim kami akan merespons dalam 1 hari kerja.",
      emailNote: "Lebih suka email? Kirim pendaftaran Anda ke",
      sources: [
        "Media Sosial (Instagram / Facebook / TikTok)",
        "Rekomendasi Teman / Keluarga",
        "Pencarian Google",
        "Brosur / Spanduk / Baliho",
        "Lainnya",
      ],
    },
  },

  invoice: {
    companyName: "PT Trans Link Internasional (TLINET)",
    companyTagline: "Internet Service Provider (ISP)",
    logoUrl: "/images/invoice/tlinet-logo.webp",
    address:
      "Gedung Cyber APJII Lantai 11, Jl. Kuningan Barat No. 8, RT.1/RW.3, Kuningan Barat, Kec. Mampang Prapatan, Kota Jakarta Selatan, DKI Jakarta 12710\nADM: BTN Rindra 4, Alya 01 / No. 4, Kel. Paenre Lompoe, Kec. Gantarang, Kab. Bulukumba, Sulawesi Selatan",
    phone: "082320003007",
    email: "finace@translinkinternasional.com",
    website: "www.translinkinternasional.com",
    title: "INVOICE",
    subtitle: "Layanan Internet & Konektivitas",
    taxRate: 11,
    // Rekening dan QR belum diberikan; bloknya baru tercetak setelah diisi di Pengaturan Invoice.
    bankName: "",
    bankAccountNumber: "",
    bankAccountHolder: "PT Trans Link Internasional",
    qrUrl: "",
    qrCaption: "Scan QR untuk pembayaran",
    signatureUrl: "",
    signatureName: "",
    signatureTitle: "Direktur",
    notes: [
      "Mohon lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari pemutusan layanan.",
      "Pembayaran dapat dilakukan melalui transfer bank ke rekening yang tertera.",
      "Setelah pembayaran, mohon konfirmasi melalui email finace@translinkinternasional.com atau WhatsApp 082320003007 dengan menyertakan nomor invoice.",
      "Terima kasih atas kepercayaan Anda menggunakan layanan dari PT Trans Link Internasional.",
    ],
    footerTagline: "Internet Cepat, Tanpa Batas",
  },
};

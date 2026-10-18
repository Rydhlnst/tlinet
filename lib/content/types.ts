export type LinkItem = { label: string; href: string };
export type SectionHead = { eyebrow: string; title: string; description: string };
export type IconCard = { icon: string; title: string; description: string };
/** Deretan logo beranda; tombolnya muncul bila logonya cukup banyak untuk dibuka menjadi kisi. */
export type LogoSectionContent = SectionHead & { moreLabel: string; lessLabel: string };

export type SiteSettings = {
  brandName: string;
  /** Akhiran nama merek yang diberi warna aksen pada logo teks. */
  brandHighlight: string;
  tagline: string;
  logoUrl: string;
  seoTitle: string;
  seoDescription: string;
  navLinks: LinkItem[];
  navCtaLabel: string;
  navCtaHref: string;
  footerDescription: string;
  footerServices: LinkItem[];
  footerLegal: LinkItem[];
  socialLinks: LinkItem[];
  address: string;
  phone: string;
  email: string;
  whatsappNumber: string;
  whatsappMessage: string;
  /** WhatsApp tim IT Support, tampil di portal Subnet (Layanan dan Progres Metro). */
  itSupportWhatsapp: string;
  cta: SectionHead & { primaryLabel: string; primaryHref: string; secondaryLabel: string };
};

export type HomeContent = {
  hero: {
    badge: string;
    title: string;
    /** Baris kedua judul, ditampilkan dengan gradasi biru. */
    titleAccent: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    imageUrl: string;
    stats: { icon: string; value: string; label: string }[];
    segments: (IconCard & { href: string })[];
  };
  features: SectionHead & { items: IconCard[] };
  packages: SectionHead & { note: string };
  why: SectionHead & {
    titleAccent: string;
    ctaLabel: string;
    ctaHref: string;
    items: { icon: string; value: string; title: string; description: string; imageUrl?: string }[];
  };
  steps: SectionHead & {
    /** Bagian dari judul yang ditampilkan dengan gradasi biru; diabaikan bila tidak ada di dalam judul. */
    titleAccent: string;
    ctaLabel: string;
    ctaHref: string;
    items: { title: string; description: string; ctaLabel: string; ctaHref: string }[];
  };
  news: SectionHead & { titleAccent: string; ctaLabel: string; ctaHref: string };
  faq: SectionHead & { titleAccent: string; ctaLabel: string; ctaHref: string; helpTitle: string; helpDescription: string };
  /** Juga kepala seluruh bagian logo: label kecil, deskripsi, dan dua baris judul besarnya. */
  partners: LogoSectionContent & { headline: string; headlineAccent: string };
  clients: LogoSectionContent;
  cdn: LogoSectionContent;
};

export type CoverageContent = {
  hero: SectionHead;
  map: {
    searchPlaceholder: string;
    locateLabel: string;
    regionsLabel: string;
    activeLabel: string;
    inactiveLabel: string;
    installingLabel: string;
    expansionLabel: string;
    myLocationLabel: string;
    signupLabel: string;
    clickHint: string;
    coveredText: string;
    installingText: string;
    expansionText: string;
    inactiveText: string;
    outsideText: string;
    centerLat: number;
    centerLng: number;
    zoom: number;
  };
  form: SectionHead & { submitLabel: string; cities: string[]; needs: string[] };
};

export type HelpContent = {
  hero: { title: string; description: string };
  quickLinks: (IconCard & { href: string })[];
  faq: { title: string; description: string; allLabel: string; categories: string[] };
};

export type AboutContent = {
  hero: { title: string; description: string };
  who: {
    eyebrow: string;
    title: string;
    /** Bagian judul yang diberi gradasi biru. */
    titleAccent: string;
    body: string;
    features: IconCard[];
    highlights: { icon: string; title: string; description: string }[];
    imageUrl: string;
    cardTitle: string;
    cardDescription: string;
    bannerTitle: string;
    bannerDescription: string;
    bannerHref: string;
  };
  vision: { title: string; body: string };
  mission: { title: string; items: string[] };
  values: SectionHead & { items: IconCard[] };
};

export type NewsContent = {
  hero: { title: string; description: string };
  readMoreLabel: string;
  emptyText: string;
  articleCta: { title: string; description: string; buttonLabel: string };
  relatedTitle: string;
};

export type RegisterContent = {
  hero: SectionHead;
  form: { title: string; submitLabel: string; note: string; emailNote: string; sources: string[] };
};

/** Identitas perusahaan dan isi tetap yang tercetak di setiap invoice. */
export type InvoiceSettings = {
  companyName: string;
  companyTagline: string;
  logoUrl: string;
  /** Satu alamat per baris. */
  address: string;
  phone: string;
  email: string;
  website: string;
  title: string;
  subtitle: string;
  /** Persentase PPN bawaan untuk invoice baru. */
  taxRate: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  qrUrl: string;
  qrCaption: string;
  /** QR atau gambar tanda tangan pejabat yang mengesahkan invoice, tercetak di bawah informasi pembayaran. */
  signatureUrl: string;
  signatureName: string;
  signatureTitle: string;
  notes: string[];
  footerTagline: string;
};

export type ContentMap = {
  settings: SiteSettings;
  invoice: InvoiceSettings;
  home: HomeContent;
  coverage: CoverageContent;
  help: HelpContent;
  about: AboutContent;
  news: NewsContent;
  register: RegisterContent;
};

export type ContentKey = keyof ContentMap;

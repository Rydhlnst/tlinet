export type LinkItem = { label: string; href: string };
export type SectionHead = { eyebrow: string; title: string; description: string };
export type IconCard = { icon: string; title: string; description: string };

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
  why: SectionHead & { ctaLabel: string; ctaHref: string; items: { value: string; title: string; description: string }[] };
  steps: SectionHead & { ctaLabel: string; ctaHref: string; items: { title: string; description: string }[] };
  faq: SectionHead & { ctaLabel: string; ctaHref: string };
  clients: SectionHead;
};

export type CoverageContent = {
  hero: SectionHead;
  map: {
    searchPlaceholder: string;
    locateLabel: string;
    regionsLabel: string;
    activeLabel: string;
    expansionLabel: string;
    myLocationLabel: string;
    signupLabel: string;
    clickHint: string;
    coveredText: string;
    expansionText: string;
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
    body: string;
    highlights: { title: string; description: string }[];
    imageUrl: string;
    cardTitle: string;
    cardDescription: string;
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

export type ContentMap = {
  settings: SiteSettings;
  home: HomeContent;
  coverage: CoverageContent;
  help: HelpContent;
  about: AboutContent;
  news: NewsContent;
  register: RegisterContent;
};

export type ContentKey = keyof ContentMap;

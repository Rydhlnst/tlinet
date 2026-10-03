import type { Metadata } from "next";
import { getContent } from "./data";

/** Alamat publik situs, dipakai untuk URL kanonis, sitemap, dan Open Graph. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`);

type PageSeo = {
  /** Kosongkan untuk beranda: judul SEO dari Pengaturan dipakai apa adanya. */
  title?: string;
  description: string;
  path: string;
  image?: string;
  article?: { publishedTime: string; tags: string[] };
};

/** Metadata satu halaman publik: judul, deskripsi, URL kanonis, Open Graph, dan kartu Twitter. */
export async function pageMetadata({ title, description, path, image, article }: PageSeo): Promise<Metadata> {
  const [settings, home] = await Promise.all([getContent("settings"), getContent("home")]);
  const shareTitle = title ?? settings.seoTitle;
  const shareImage = image || home.hero.imageUrl;
  const images = shareImage ? [shareImage] : undefined;
  const base = { siteName: settings.brandName, locale: "id_ID", url: path, title: shareTitle, description, images };

  return {
    title: title ?? { absolute: settings.seoTitle },
    description,
    alternates: { canonical: path },
    openGraph: article ? { ...base, type: "article", publishedTime: article.publishedTime, tags: article.tags } : { ...base, type: "website" },
    twitter: { card: images ? "summary_large_image" : "summary", title: shareTitle, description, images },
  };
}

import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/data";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

const pages: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/area-jangkauan", priority: 0.9 },
  { path: "/formulir-registrasi", priority: 0.8 },
  { path: "/bantuan", priority: 0.7 },
  { path: "/tentang-kami", priority: 0.6 },
  { path: "/berita", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles();
  return [
    ...pages.map((page) => ({ url: `${siteUrl}${page.path}`, changeFrequency: "weekly" as const, priority: page.priority })),
    ...articles.map((article) => ({
      url: `${siteUrl}/berita/${article.slug}`,
      lastModified: new Date(`${article.publishDate}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}

import type { Metadata } from "next";
import { ArticleCard } from "@/components/site/article-card";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/ui";
import { getContent, getPublishedArticles } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getContent("news");
  return { title: hero.title, description: hero.description };
}

export default async function NewsPage() {
  const [settings, news, articles] = await Promise.all([getContent("settings"), getContent("news"), getPublishedArticles()]);

  return (
    <>
      <PageHero {...news.hero} />
      <section className="container-page pt-16 sm:pt-20">
        {articles.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} readMoreLabel={news.readMoreLabel} />
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed py-16 text-center text-muted-foreground">{news.emptyText}</p>
        )}
      </section>
      <CtaBand settings={settings} />
    </>
  );
}

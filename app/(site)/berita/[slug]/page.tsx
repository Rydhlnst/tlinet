import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCover, ArticleMeta } from "@/components/site/article-card";
import { CtaBand } from "@/components/site/cta-band";
import { JsonLd } from "@/components/site/json-ld";
import { LinkButton } from "@/components/site/ui";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { getArticle, getContent, getPublishedArticles } from "@/lib/data";
import { whatsappUrl } from "@/lib/format";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  return (await getPublishedArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps<"/berita/[slug]">): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return {};
  return pageMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/berita/${article.slug}`,
    image: article.coverUrl,
    article: { publishedTime: `${article.publishDate}T00:00:00+08:00`, tags: article.tags },
  });
}

type Block = { type: "heading" | "paragraph"; text: string } | { type: "list"; items: string[] };

/** Isi artikel ditulis sebagai teks biasa: "## " subjudul, "- " butir daftar, baris kosong pemisah paragraf. */
function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    for (const line of chunk.split("\n").map((item) => item.trim()).filter(Boolean)) {
      const last = blocks.at(-1);
      if (line.startsWith("## ")) blocks.push({ type: "heading", text: line.slice(3) });
      else if (line.startsWith("- ")) {
        if (last?.type === "list") last.items.push(line.slice(2));
        else blocks.push({ type: "list", items: [line.slice(2)] });
      } else blocks.push({ type: "paragraph", text: line });
    }
  }
  return blocks;
}

export default async function ArticlePage({ params }: PageProps<"/berita/[slug]">) {
  const { slug } = await params;
  const [article, settings, news, articles] = await Promise.all([
    getArticle(slug),
    getContent("settings"),
    getContent("news"),
    getPublishedArticles(),
  ]);
  if (!article) notFound();
  const related = articles.filter((item) => item.id !== article.id).slice(0, 2);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          datePublished: `${article.publishDate}T00:00:00+08:00`,
          articleSection: article.category,
          keywords: article.tags.join(", "),
          image: article.coverUrl ? [absoluteUrl(article.coverUrl)] : undefined,
          mainEntityOfPage: absoluteUrl(`/berita/${article.slug}`),
          author: { "@type": "Organization", name: settings.brandName },
          publisher: {
            "@type": "Organization",
            name: settings.brandName,
            logo: { "@type": "ImageObject", url: absoluteUrl(settings.logoUrl || "/icon.svg") },
          },
        }}
      />
      <article className="container-page max-w-3xl pt-12 sm:pt-16">
        <Link href="/berita" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {news.hero.title}
        </Link>

        <header className="mt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {article.category && (
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold tracking-wider text-brand-ink uppercase">{article.category}</span>
            )}
            <ArticleMeta article={article} />
          </div>
          <h1 className="text-3xl leading-[1.15] font-semibold sm:text-[2.6rem]">{article.title}</h1>
          {article.excerpt && <p className="text-lg leading-relaxed text-pretty text-muted-foreground">{article.excerpt}</p>}
        </header>

        <div className="mt-10 aspect-[16/9] overflow-hidden rounded-3xl border">
          <ArticleCover article={article} eager sizes="(min-width: 768px) 768px, 100vw" />
        </div>

        <div className="mt-10 flex flex-col gap-5 text-[17px] leading-[1.8] text-foreground/85">
          {parseBody(article.body).map((block, index) =>
            block.type === "heading" ? (
              <h2 key={index} className="mt-4 text-2xl font-semibold text-foreground">
                {block.text}
              </h2>
            ) : block.type === "list" ? (
              <ul key={index} className="flex list-disc flex-col gap-2 pl-5 marker:text-brand">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={index}>{block.text}</p>
            ),
          )}
        </div>

        {article.tags.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-2 border-t pt-8">
            {article.tags.map((tag) => (
              <li key={tag} className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                #{tag}
              </li>
            ))}
          </ul>
        )}

        <aside className="mt-10 flex flex-col items-start gap-4 rounded-3xl border bg-muted/50 p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{news.articleCta.title}</h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{news.articleCta.description}</p>
          </div>
          <LinkButton href={whatsappUrl(settings.whatsappNumber, settings.whatsappMessage)} variant="brand" className="shrink-0">
            <WhatsAppIcon className="size-4" />
            {news.articleCta.buttonLabel}
          </LinkButton>
        </aside>
      </article>

      {related.length > 0 && (
        <section className="container-page max-w-3xl pt-16">
          <h2 className="text-xl font-semibold">{news.relatedTitle}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.id}>
                <Link href={`/berita/${item.slug}`} className="flex h-full flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-brand/40">
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-brand-ink uppercase">{item.category}</span>
                  <span className="mt-2 leading-snug font-semibold">{item.title}</span>
                  <ArticleMeta article={item} className="mt-auto pt-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CtaBand settings={settings} />
    </>
  );
}

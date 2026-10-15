import { ArrowRight } from "lucide-react";
import type { HomeContent } from "@/lib/content/types";
import type { Article } from "@/lib/data";
import { ArticleCard } from "./article-card";
import { AccentText, LinedEyebrow } from "./decor";
import { NodeField } from "./node-field";
import { SulawesiMap } from "./sulawesi-map";
import { LinkButton } from "./ui";

type Props = { content: HomeContent["news"]; articles: Article[]; readMoreLabel: string };

/** Bagian berita beranda: pita biru malam berisi judul, lalu tiga artikel terbaru yang menumpang di tepi bawahnya. */
export function NewsSection({ content, articles, readMoreLabel }: Props) {
  if (!articles.length) return null;

  return (
    <section className="relative">
      <div className="surface-ink relative overflow-hidden pt-20 pb-48 text-white sm:pt-24">
        <NodeField tone="dark" className="opacity-80" />
        <SulawesiMap id="news" className="absolute -top-6 -right-10 hidden h-[130%] w-72 opacity-70 md:block" />
        <div className="container-page relative flex flex-col items-center gap-4 text-center">
          <LinedEyebrow tone="dark">{content.eyebrow}</LinedEyebrow>
          <h2 className="max-w-3xl text-3xl leading-[1.12] font-bold sm:text-4xl lg:text-[2.75rem]">
            <AccentText text={content.title} accent={content.titleAccent} accentClassName="from-[#4f8dff] to-[#38bdf8]" />
          </h2>
          {content.description && <p className="max-w-2xl text-base leading-relaxed text-pretty text-white/75 sm:text-lg">{content.description}</p>}
        </div>
      </div>

      <div className="container-page relative -mt-36 pb-20 sm:pb-24">
        <div data-reveal-stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <ArticleCard key={article.id} article={article} readMoreLabel={readMoreLabel} />
          ))}
        </div>
        {content.ctaLabel && (
          <div className="mt-10 flex justify-center">
            <LinkButton href={content.ctaHref || "/berita"} variant="outline" className="border-primary/30 px-7 text-primary">
              {content.ctaLabel}
              <ArrowRight />
            </LinkButton>
          </div>
        )}
      </div>
    </section>
  );
}

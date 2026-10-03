import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CmsImage } from "./ui";

/** Sampul artikel; tanpa gambar, tampil panel gelap berisi kategori. */
export function ArticleCover({ article, className, eager }: { article: Pick<Article, "coverUrl" | "title" | "category">; className?: string; eager?: boolean }) {
  if (article.coverUrl) {
    return <CmsImage src={article.coverUrl} alt={article.title} loading={eager ? "eager" : "lazy"} className={cn("size-full object-cover", className)} />;
  }
  return (
    <div className={cn("relative flex size-full items-end overflow-hidden bg-ink p-6", className)} aria-hidden="true">
      <div className="absolute -top-16 -right-10 size-56 rounded-full bg-brand/35 blur-3xl" />
      <svg viewBox="0 0 200 120" className="absolute inset-0 size-full" fill="none" preserveAspectRatio="xMidYMid slice">
        <g stroke="white" strokeOpacity="0.12">
          <circle cx="150" cy="30" r="30" />
          <circle cx="150" cy="30" r="60" />
          <circle cx="150" cy="30" r="95" />
        </g>
      </svg>
      <span className="relative text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">{article.category}</span>
    </div>
  );
}

export function ArticleMeta({ article, className }: { article: Pick<Article, "publishDate" | "readMinutes">; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-xs whitespace-nowrap text-muted-foreground", className)}>
      <time dateTime={article.publishDate}>{formatDate(article.publishDate)}</time>
      <span aria-hidden="true">·</span>
      <span>{article.readMinutes} min baca</span>
    </p>
  );
}

export function ArticleCard({ article, readMoreLabel }: { article: Article; readMoreLabel: string }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
      <div className="aspect-[16/10] overflow-hidden">
        <ArticleCover article={article} className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        {article.category && <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">{article.category}</p>}
        <h2 className="mt-3 text-lg leading-snug font-semibold">
          <Link href={`/berita/${article.slug}`} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-6">
          <ArticleMeta article={article} />
          <span className="inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-foreground">
            {readMoreLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

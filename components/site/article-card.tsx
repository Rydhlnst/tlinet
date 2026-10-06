import { ArrowRight, BookOpen, ChartNoAxesColumn, Newspaper, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CmsImage } from "./ui";

/** Angka kecil yang stabil dari sebuah teks, untuk memilih sampul bawaan artikel berkategori lain. */
function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 9973;
  return value;
}

/** Sampul bawaan untuk artikel tanpa gambar unggahan: kabel fiber, router, dan gedung kota. */
const fallbackCovers = ["/images/news/jaringan.webp", "/images/news/panduan.webp", "/images/news/teknologi.webp"];

function fallbackCover(slug: string, category: string) {
  const index = /jaringan|infrastruktur/i.test(category) ? 0 : /panduan|edukasi|tips/i.test(category) ? 1 : /bisnis|teknologi/i.test(category) ? 2 : hash(slug) % 3;
  return fallbackCovers[index];
}

/** Sampul artikel; tanpa gambar unggahan, dipakai sampul bawaan sesuai kategorinya. */
export function ArticleCover({ article, className, eager }: { article: Pick<Article, "coverUrl" | "title" | "slug" | "category">; className?: string; eager?: boolean }) {
  return (
    <CmsImage
      src={article.coverUrl || fallbackCover(article.slug, article.category)}
      alt={article.coverUrl ? article.title : ""}
      loading={eager ? "eager" : "lazy"}
      className={cn("size-full object-cover", className)}
    />
  );
}

const categoryIcons: [RegExp, LucideIcon][] = [
  [/jaringan|infrastruktur/i, ChartNoAxesColumn],
  [/panduan|edukasi|tips/i, BookOpen],
  [/teknologi|bisnis/i, Settings],
];

export function CategoryChip({ category, className }: { category: string; className?: string }) {
  if (!category) return null;
  const IconComponent = categoryIcons.find(([pattern]) => pattern.test(category))?.[1] ?? Newspaper;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full bg-ink/80 px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-white uppercase backdrop-blur", className)}>
      <IconComponent className="size-3.5 text-sky-300" />
      {category}
    </span>
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

export function ArticleCard({ article, readMoreLabel, heading: Heading = "h3" }: { article: Article; readMoreLabel: string; heading?: "h2" | "h3" }) {
  return (
    // Sampul diberi jarak dari tepi kartu dan sudutnya sendiri, sehingga garis tepi tidak beradu dengan gambar gelap.
    <article className="group relative flex flex-col rounded-3xl border border-foreground/[0.06] bg-card p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-18px_rgba(30,64,175,0.22)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_28px_56px_-20px_rgba(30,64,175,0.32)]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.15rem]">
        <ArticleCover article={article} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        <CategoryChip category={article.category} className="absolute top-3 left-3" />
      </div>
      <div className="flex flex-1 flex-col px-4 pt-5 pb-4">
        <ArticleMeta article={article} />
        <Heading className="mt-3 text-lg leading-snug font-bold transition-colors group-hover:text-primary">
          <Link href={`/berita/${article.slug}`} className="after:absolute after:inset-0 after:rounded-3xl">
            {article.title}
          </Link>
        </Heading>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-4 pt-6">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-primary">
            {readMoreLabel}
            <ArrowRight className="size-4" />
          </span>
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            <ArrowRight className="size-4.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

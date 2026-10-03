import { ArrowRight, BookOpen, ChartNoAxesColumn, Newspaper, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import type { Article } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CmsImage } from "./ui";

/** Angka kecil yang stabil dari sebuah teks, untuk memvariasikan sampul buatan per artikel. */
function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 9973;
  return value;
}

/** Sampul buatan untuk artikel tanpa gambar: langit malam biru, perbukitan, dan satu motif jaringan. */
function GeneratedCover({ seed, category }: { seed: string; category: string }) {
  const id = useId();
  const value = hash(seed);
  // 0 menara pemancar, 1 router, 2 gedung kota
  const motif = /jaringan|infrastruktur/i.test(category) ? 0 : /panduan|edukasi|tips/i.test(category) ? 1 : /bisnis|teknologi/i.test(category) ? 2 : value % 3;
  const shift = (value % 60) - 30;

  return (
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" className="size-full">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="250" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a1238" />
          <stop offset="0.6" stopColor="#1b3aa8" />
          <stop offset="1" stopColor="#3f7cf2" />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill={`url(#${id}-sky)`} />
      {/* bintang / titik jaringan */}
      <g fill="white">
        {Array.from({ length: 26 }, (_, index) => {
          const x = (index * 97 + value * 13) % 400;
          const y = (index * 53 + value * 7) % 130;
          return <circle key={index} cx={x} cy={y} r={index % 4 === 0 ? 1.6 : 0.9} opacity={0.25 + (index % 5) * 0.12} />;
        })}
      </g>
      <g stroke="#9ccbff" strokeOpacity="0.45" strokeWidth="1">
        <path d={`M${20 + shift} 150Q${130 + shift} 30 ${250 + shift} 120`} />
        <path d={`M${150 - shift} 160Q${270 - shift} 20 ${390 - shift} 110`} />
      </g>
      {/* perbukitan */}
      <path d={`M0 190C60 ${160 + (value % 20)} 120 ${200 - (value % 25)} 200 178S330 ${150 + (value % 30)} 400 180V250H0Z`} fill="#0d1a52" fillOpacity="0.75" />
      <path d={`M0 215C80 ${195 + (value % 15)} 170 225 250 205S350 ${190 + (value % 18)} 400 208V250H0Z`} fill="#081033" />
      {motif === 0 && (
        // menara pemancar
        <g transform={`translate(${285 + shift / 2} 62)`} stroke="#dbeafe" strokeWidth="2" strokeLinecap="round">
          <path d="M0 150 16 0 32 150M5 105h22M9 65h14M-2 150h36M5 105l22-40M27 105 9 65" />
          <g strokeOpacity="0.7">
            <path d="M-8 6a26 26 0 0 1 0-28M40 6a26 26 0 0 0 0-28" />
            <path d="M-20 14a44 44 0 0 1 0-44M52 14a44 44 0 0 0 0-44" strokeOpacity="0.4" />
          </g>
          <circle cx="16" cy="-6" r="4" fill="#7dd3fc" stroke="none" />
        </g>
      )}
      {motif === 1 && (
        // router dengan gelombang Wi-Fi
        <g transform={`translate(${250 + shift / 2} 96)`}>
          <g stroke="#bfe0ff" strokeWidth="5" strokeLinecap="round">
            <path d="M18 34a42 42 0 0 1 60 0" strokeOpacity="0.9" />
            <path d="M30 46a25 25 0 0 1 36 0" strokeOpacity="0.9" />
            <path d="M6 22a59 59 0 0 1 84 0" strokeOpacity="0.45" />
          </g>
          <rect x="6" y="66" width="7" height="48" rx="3.5" fill="#dbeafe" />
          <rect x="83" y="66" width="7" height="48" rx="3.5" fill="#dbeafe" />
          <rect y="104" width="96" height="30" rx="9" fill="white" />
          <rect x="16" y="117" width="26" height="4" rx="2" fill="#3b82f6" />
          <circle cx="70" cy="119" r="3" fill="#3b82f6" />
          <circle cx="80" cy="119" r="3" fill="#bcd0f7" />
        </g>
      )}
      {motif === 2 && (
        // gedung kota
        <g transform={`translate(${220 + shift / 2} 0)`} fill="#122060" stroke="#5b8def" strokeOpacity="0.5">
          <rect x="0" y="120" width="34" height="100" />
          <rect x="40" y="84" width="40" height="136" />
          <rect x="86" y="108" width="30" height="112" />
          <rect x="122" y="64" width="38" height="156" />
          <g fill="#9ccbff" stroke="none">
            {[0, 1, 2, 3, 4, 5].map((row) =>
              [0, 1, 2].map((column) => <rect key={`${row}-${column}`} x={47 + column * 10} y={94 + row * 18} width="5" height="7" opacity={(row + column + value) % 3 ? 0.9 : 0.25} />),
            )}
            {[0, 1, 2, 3, 4, 5, 6].map((row) =>
              [0, 1, 2].map((column) => <rect key={`b-${row}-${column}`} x={129 + column * 10} y={74 + row * 18} width="5" height="7" opacity={(row * 2 + column + value) % 3 ? 0.9 : 0.25} />),
            )}
          </g>
        </g>
      )}
    </svg>
  );
}

/** Sampul artikel; tanpa gambar unggahan, dibuatkan ilustrasi yang berbeda untuk tiap artikel. */
export function ArticleCover({ article, className, eager }: { article: Pick<Article, "coverUrl" | "title" | "slug" | "category">; className?: string; eager?: boolean }) {
  if (article.coverUrl) {
    return <CmsImage src={article.coverUrl} alt={article.title} loading={eager ? "eager" : "lazy"} className={cn("size-full object-cover", className)} />;
  }
  return (
    <div className={cn("size-full", className)}>
      <GeneratedCover seed={article.slug} category={article.category} />
    </div>
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
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-lg shadow-primary/5 ring-1 ring-border transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10">
      <div className="relative aspect-[16/10] overflow-hidden">
        <ArticleCover article={article} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        <CategoryChip category={article.category} className="absolute top-4 left-4" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <ArticleMeta article={article} />
        <Heading className="mt-3 text-lg leading-snug font-bold transition-colors group-hover:text-primary">
          <Link href={`/berita/${article.slug}`} className="after:absolute after:inset-0">
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

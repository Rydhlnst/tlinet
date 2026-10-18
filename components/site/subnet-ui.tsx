import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Gaya Portal Subnet: permukaan datar (kartu putih bergaris tipis, tanpa bayangan), judul berupa teks, dan daftar
 * berbaris pemisah seperti aplikasi bank atau operator, bukan kartu berhias.
 */

/** Bagian berbentuk kartu. Ikon judul (opsional) tampil polos di depan judul. */
export function SectionCard({ title, icon: Icon, action, children, className }: { title?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-card", className)}>
      {title && (
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 px-4 pt-3.5 pb-1 sm:px-5">
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
            {Icon && <Icon className="size-4 text-muted-foreground" />}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Tautan teks kecil di kanan judul kartu, mis. "Lihat semua". */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-sm font-medium text-brand-ink hover:underline">
      {children}
      <ChevronRight className="size-4" />
    </Link>
  );
}

/** Baris label–nilai bergaris pemisah; nilai rata kanan seperti daftar pengaturan di aplikasi. */
export function DetailRows({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y px-4 pb-1 sm:px-5">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 py-3 text-sm">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-right font-medium break-words">{value || <span className="font-normal text-muted-foreground">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

type RowIcon = LucideIcon | ComponentType<{ className?: string }>;

/** Satu baris menu: ikon polos, judul, keterangan, dan panah. Tanpa `href` baris tampil redup (tidak tersedia). */
export function ListRow({ href, icon: Icon, title, subtitle, external, trailing }: { href?: string; icon: RowIcon; title: string; subtitle?: ReactNode; external?: boolean; trailing?: ReactNode }) {
  const body = (
    <>
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {trailing}
      {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" />}
    </>
  );
  const className = "flex min-h-14 items-center gap-3.5 px-4 py-3 sm:px-5";
  if (!href) return <div className={cn(className, "opacity-55")}>{body}</div>;
  if (external || /^(https?:|tel:|mailto:)/.test(href)) {
    return (
      <a href={href} {...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cn(className, "transition-colors hover:bg-muted/60 active:bg-muted")}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(className, "transition-colors hover:bg-muted/60 active:bg-muted")}>
      {body}
    </Link>
  );
}

/** Titik status dengan teks, tanpa latar berwarna. */
export function StatusDot({ tone, children, className }: { tone: "good" | "warn" | "bad" | "muted"; children: ReactNode; className?: string }) {
  const dot = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500", muted: "bg-muted-foreground/50" }[tone];
  const text = { good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700", muted: "text-muted-foreground" }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", text, className)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}

/** Judul halaman untuk layar lebar; di HP judul tampil di bilah atas. */
export function PageHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="hidden items-end justify-between gap-4 md:flex">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-white/75">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Ucapan sesuai jam di WITA. */
export function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "numeric", hour12: false }).format(now));
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TowerScene } from "./admin-art";

/**
 * Banner judul halaman dashboard: judul dengan kata terakhir berwarna biru, keterangan, ilustrasi menara, dan tombol aksi.
 * Di HP judul sudah ada di bilah atas, jadi yang tampil hanya tombol aksinya.
 */
export function PageHero({
  title,
  accent,
  description,
  icon: Icon,
  actions,
  meta,
  variant = "day",
}: {
  title: string;
  /** Bagian judul yang diberi warna; bawaannya kata terakhir (bila judul lebih dari satu kata). */
  accent?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Isi tambahan di kanan atas banner, mis. tanggal hari ini. */
  meta?: ReactNode;
  variant?: "day" | "night";
}) {
  const words = title.split(" ");
  const highlight = accent ?? (words.length > 1 ? words.at(-1)! : "");
  const lead = highlight && title.endsWith(highlight) ? title.slice(0, title.length - highlight.length) : title;
  const night = variant === "night";

  return (
    <>
      <section
        className={cn(
          "relative hidden overflow-hidden rounded-2xl border px-7 py-6 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)] md:block",
          night
            ? "border-blue-900/60 bg-[radial-gradient(120%_140%_at_80%_0%,#1d4ed8_0%,#0b1a45_45%,#060d24_100%)] text-white"
            : "bg-[linear-gradient(100deg,#ffffff_0%,#f5f9ff_45%,#e3eeff_100%)] dark:border-blue-900/50 dark:bg-[linear-gradient(100deg,var(--card)_0%,#10224a_60%,#173373_100%)]",
        )}
      >
        {night ? (
          <TowerScene tone="night" idPrefix="hero" className="absolute right-0 bottom-0 h-[115%] w-[58%] opacity-90" />
        ) : (
          <>
            <TowerScene tone="day" idPrefix="hero" className="absolute right-0 bottom-0 h-[112%] w-[52%] dark:hidden" />
            <TowerScene tone="night" idPrefix="hero" className="absolute right-0 bottom-0 hidden h-[112%] w-[52%] opacity-80 dark:block" />
          </>
        )}
        <div className="relative flex items-center gap-6">
          {Icon && (
            <span
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-2xl",
                night ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-brand-soft text-brand-ink ring-1 ring-brand/10 dark:bg-white/10 dark:text-white",
              )}
            >
              <Icon className="size-8" />
            </span>
          )}
          <div className="max-w-2xl min-w-0 flex-1">
            <h1 className={cn("text-3xl font-bold tracking-tight lg:text-[2.125rem]", night && "text-white")}>
              {lead}
              {highlight && <span className={night ? "text-sky-300" : "text-brand-ink"}>{highlight}</span>}
            </h1>
            {description && <div className={cn("mt-1.5 text-sm leading-relaxed", night ? "text-blue-100/85" : "text-muted-foreground")}>{description}</div>}
          </div>
          {(actions || meta) && (
            <div className="relative ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2.5 [&_[data-slot=button]]:rounded-full [&_[data-variant=default]]:shadow-[0_8px_20px_-8px_rgba(37,99,235,0.8)] [&_[data-variant=outline]]:bg-card">
              {meta}
              {actions}
            </div>
          )}
        </div>
      </section>
      {actions && <div className="flex flex-wrap items-center gap-2 md:hidden [&>*]:flex-1">{actions}</div>}
    </>
  );
}

const tones = {
  blue: { card: "from-blue-50 border-blue-100 dark:border-blue-500/30", icon: "bg-blue-500 text-white shadow-blue-500/30", bar: "bg-blue-500", soft: "bg-blue-100 dark:bg-blue-500/20", spark: "#3b82f6" },
  green: { card: "from-emerald-50 border-emerald-100 dark:border-emerald-500/30", icon: "bg-emerald-500 text-white shadow-emerald-500/30", bar: "bg-emerald-500", soft: "bg-emerald-100 dark:bg-emerald-500/20", spark: "#10b981" },
  orange: { card: "from-orange-50 border-orange-100 dark:border-orange-500/30", icon: "bg-orange-500 text-white shadow-orange-500/30", bar: "bg-orange-500", soft: "bg-orange-100 dark:bg-orange-500/20", spark: "#f97316" },
  red: { card: "from-rose-50 border-rose-100 dark:border-rose-500/30", icon: "bg-rose-500 text-white shadow-rose-500/30", bar: "bg-rose-500", soft: "bg-rose-100 dark:bg-rose-500/20", spark: "#f43f5e" },
  amber: { card: "from-amber-50 border-amber-100 dark:border-amber-500/30", icon: "bg-amber-400 text-white shadow-amber-400/30", bar: "bg-amber-400", soft: "bg-amber-100 dark:bg-amber-500/20", spark: "#f59e0b" },
  cyan: { card: "from-cyan-50 border-cyan-100 dark:border-cyan-500/30", icon: "bg-cyan-500 text-white shadow-cyan-500/30", bar: "bg-cyan-500", soft: "bg-cyan-100 dark:bg-cyan-500/20", spark: "#06b6d4" },
  purple: { card: "from-violet-50 border-violet-100 dark:border-violet-500/30", icon: "bg-violet-500 text-white shadow-violet-500/30", bar: "bg-violet-500", soft: "bg-violet-100 dark:bg-violet-500/20", spark: "#8b5cf6" },
} as const;

export type StatTone = keyof typeof tones;

/** Garis tren kecil dengan area lembut di bawahnya. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => [(index / (values.length - 1)) * 100, 36 - (value / max) * 32] as const);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-3 h-10 w-full" aria-hidden="true">
      <path d={`${line} L100,40 L0,40 Z`} fill={color} opacity="0.15" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Kartu angka berwarna: ikon bulat, label, nilai besar, keterangan, dan bilah atau garis tren opsional. */
export function StatCard({
  tone,
  icon: Icon,
  label,
  value,
  hint,
  progress,
  spark,
  href,
}: {
  tone: StatTone;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** 0–1: bilah kemajuan di bawah kartu. */
  progress?: number;
  spark?: number[];
  href?: string;
}) {
  const style = tones[tone];
  const body = (
    <>
      <div className="flex flex-col items-start gap-2.5 md:flex-row md:items-center md:gap-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full shadow-lg md:size-12", style.icon)}>
          <Icon className="size-5 md:size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground/80 md:text-sm">{label}</p>
          <p className="mt-0.5 text-base font-bold tracking-tight break-words tabular-nums md:text-xl 2xl:text-2xl">{value}</p>
          {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
      {spark && <Sparkline values={spark} color={style.spark} />}
      {progress !== undefined && (
        <div className={cn("mt-4 h-1.5 overflow-hidden rounded-full", style.soft)} aria-hidden="true">
          <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </div>
      )}
    </>
  );
  const className = cn(
    "block min-w-0 rounded-2xl border bg-gradient-to-br to-card p-4 shadow-[0_6px_24px_-14px_rgba(15,23,42,0.25)] md:p-5 dark:from-card dark:shadow-[0_0_24px_-10px_rgba(59,130,246,0.45)]",
    style.card,
    href && "transition-transform hover:-translate-y-0.5",
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Kisi kartu angka: dua kolom di HP dan tablet, empat di layar lebar. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">{children}</div>;
}

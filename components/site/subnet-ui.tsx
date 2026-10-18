import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bagian berbentuk kartu di Portal Subnet. */
export function SectionCard({ title, icon: Icon, action, children, className }: { title?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-3xl border bg-card shadow-sm shadow-ink/5", className)}>
      {title && (
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-1">
          <h2 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold">
            {Icon && (
              <span className="flex size-8 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-4" />
              </span>
            )}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Baris label–nilai bergaris pemisah; nilai rata kanan seperti daftar pengaturan di aplikasi. */
export function DetailRows({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y px-5 pb-2">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 py-3 text-sm">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-right font-medium break-words">{value || <span className="font-normal text-muted-foreground">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Judul halaman untuk layar lebar; di HP judul tampil di bilah atas. */
export function PageHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="hidden items-end justify-between gap-4 md:flex">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
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

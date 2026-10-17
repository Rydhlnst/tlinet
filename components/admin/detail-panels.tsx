import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Potongan tampilan detail pelanggan, dipakai halaman Detail Pelanggan di admin dan portal Subnet. */

/** Dua huruf awal nama ("Ahmad Rahman" → "AR"). */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export const pillTones = {
  good: ["bg-emerald-50 text-emerald-700", "bg-emerald-500"],
  warn: ["bg-amber-50 text-amber-700", "bg-amber-500"],
  bad: ["bg-red-50 text-red-700", "bg-red-500"],
  muted: ["bg-muted text-muted-foreground", "bg-muted-foreground/60"],
};

export const customerTones: Record<string, keyof typeof pillTones> = { active: "good", inactive: "muted", suspended: "bad", relocation: "warn" };

export function StatusPill({ tone, children }: { tone: keyof typeof pillTones; children: ReactNode }) {
  const [surface, dot] = pillTones[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", surface)}>
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Panel({ icon: Icon, title, action, children, className }: { icon: LucideIcon; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="flex items-center gap-2.5 text-base font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
            <Icon className="size-4" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InfoList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-3 p-5 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value || <span className="font-normal text-muted-foreground">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

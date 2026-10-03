"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Package, PackageCategory } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { linkButtonClass } from "./ui";

/** Memisahkan awalan mata uang ("Rp") dari angkanya agar bisa ditampilkan kecil di depan harga. */
function splitPrice(price: string) {
  const match = price.match(/^(Rp\.?)\s*(.+)$/i);
  return match ? { currency: "Rp", amount: match[2] } : { currency: "", amount: price };
}

function PackageCard({ item }: { item: Package }) {
  const { featured } = item;
  const { currency, amount } = splitPrice(item.price);

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-brand-soft/80 via-card via-30% to-card px-6 pt-9 pb-7 text-center transition-all",
        featured
          ? "shadow-2xl shadow-primary/20 ring-2 ring-primary lg:-translate-y-2"
          : "shadow-sm ring-1 ring-border hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10",
      )}
    >
      {/* Paket unggulan memakai pita di sudut; paket lain menampilkan labelnya sebagai pil kecil. */}
      {featured && (
        <span className="absolute top-0 right-0 w-[200px] translate-x-[50px] translate-y-[calc(50px-50%)] rotate-45 bg-primary py-1.5 text-center text-[9px] font-bold tracking-[0.12em] text-white uppercase shadow-md">
          {item.badge || "Populer"}
        </span>
      )}
      {!featured && item.badge && (
        <span className="mx-auto mb-4 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold tracking-wider text-brand-ink uppercase">{item.badge}</span>
      )}

      <h3 className="text-xl font-extrabold tracking-wide uppercase">{item.name}</h3>
      {item.speedLabel && <p className="mt-1.5 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">{item.speedLabel}</p>}

      <p className="mt-6 bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-4xl leading-tight font-extrabold tracking-tight text-transparent sm:text-[2.6rem]">
        {item.speed}
      </p>

      <p className="mt-5 flex items-end justify-center gap-1">
        {currency && <span className="pb-1.5 text-sm font-medium text-muted-foreground">{currency}</span>}
        <span className={cn("leading-none font-extrabold tracking-tight", amount.length > 9 ? "text-3xl" : "text-[2.6rem]")}>{amount}</span>
      </p>
      {item.priceUnit && <p className="mt-1.5 text-sm text-muted-foreground">{item.priceUnit}</p>}
      {item.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}

      <ul className="mt-6 flex flex-1 flex-col gap-3.5 border-t pt-6 text-left text-sm">
        {item.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/80">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/formulir-registrasi?paket=${encodeURIComponent(item.name)}`}
        className={linkButtonClass(featured ? "primary" : "ink", "mt-8 h-12 w-full text-[15px]")}
      >
        {item.ctaLabel || "Pesan Sekarang"}
      </Link>
    </article>
  );
}

export function PackageTabs({ categories, packages }: { categories: PackageCategory[]; packages: Package[] }) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const visible = packages.filter((item) => item.categoryId === activeId);

  return (
    <div className="flex flex-col gap-10">
      <div role="tablist" aria-label="Kategori paket" className="mx-auto grid w-full max-w-4xl gap-2 rounded-3xl border bg-muted/50 p-2 sm:grid-cols-3">
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveId(category.id)}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active ? "bg-background shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-primary text-white" : "bg-background text-muted-foreground ring-1 ring-border",
                )}
              >
                <Icon name={category.icon} className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{category.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{category.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        className={cn(
          "mx-auto grid w-full items-stretch gap-5 pt-2",
          visible.length === 1
            ? "max-w-sm"
            : visible.length === 2
              ? "max-w-3xl md:grid-cols-2"
              : visible.length === 3
                ? "md:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {visible.map((item) => (
          <PackageCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

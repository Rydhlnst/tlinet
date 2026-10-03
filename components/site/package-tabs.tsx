"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Package, PackageCategory } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { linkButtonClass } from "./ui";

function PackageCard({ item }: { item: Package }) {
  const dark = item.featured;
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl border p-7 transition-shadow",
        dark ? "border-ink bg-ink text-white shadow-xl shadow-ink/20" : "bg-card hover:shadow-lg hover:shadow-primary/5",
      )}
    >
      {item.badge && (
        <span
          className={cn(
            "mb-5 w-fit rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase",
            dark ? "bg-brand text-brand-foreground" : "bg-brand-soft text-brand-ink",
          )}
        >
          {item.badge}
        </span>
      )}
      <h3 className="text-xl font-semibold">{item.name}</h3>
      {item.description && (
        <p className={cn("mt-2 text-sm leading-relaxed", dark ? "text-white/65" : "text-muted-foreground")}>{item.description}</p>
      )}

      <div className={cn("mt-6 flex items-baseline gap-2 border-t pt-6", dark ? "border-white/10" : "border-border")}>
        <span className="text-4xl font-semibold tracking-tight">{item.speed}</span>
        {item.speedLabel && (
          <span className={cn("text-[11px] font-semibold tracking-wider uppercase", dark ? "text-sky-300" : "text-brand-ink")}>{item.speedLabel}</span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold">{item.price}</span>
        <span className={cn("text-sm", dark ? "text-white/55" : "text-muted-foreground")}>{item.priceUnit}</span>
      </p>

      <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
        {item.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <Check className={cn("mt-0.5 size-4 shrink-0", dark ? "text-sky-300" : "text-brand-ink")} />
            <span className={dark ? "text-white/85" : "text-foreground/80"}>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/formulir-registrasi?paket=${encodeURIComponent(item.name)}`}
        className={linkButtonClass(dark ? "white" : "outline", "mt-8 w-full")}
      >
        {item.ctaLabel || "Pilih Paket Ini"}
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
          "mx-auto grid w-full gap-5",
          visible.length === 1 ? "max-w-md" : visible.length === 2 ? "max-w-3xl md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {visible.map((item) => (
          <PackageCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

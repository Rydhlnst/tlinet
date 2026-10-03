"use client";

import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { LinkItem } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { LinkButton } from "./ui";

type Props = { brandName: string; brandHighlight: string; logoUrl: string; navLinks: LinkItem[]; ctaLabel: string; ctaHref: string };

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Header mengambang berlatar biru malam; tingginya (4.75rem) dipakai kelas `hero-under-header`. */
export function SiteHeader({ brandName, brandHighlight, logoUrl, navLinks, ctaLabel, ctaHref }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-ink/80 px-4 text-white shadow-lg shadow-ink/20 backdrop-blur-xl sm:px-6">
        <Link href="/" aria-label={`${brandName} — beranda`}>
          <Brand name={brandName} highlight={brandHighlight} logoUrl={logoUrl} inverted />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu utama">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.label + link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition-colors hover:text-white xl:px-3.5",
                  active && "text-sky-300 after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-sky-300",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {ctaLabel && (
            <LinkButton href={ctaHref || "/formulir-registrasi"} className="hidden h-10 px-5 sm:inline-flex">
              {ctaLabel}
              <ArrowRight />
            </LinkButton>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white lg:hidden"
                aria-label="Buka menu"
              >
                <Menu className="size-4.5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,88vw)]">
              <SheetHeader>
                <SheetTitle>
                  <Brand name={brandName} highlight={brandHighlight} logoUrl={logoUrl} />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Menu utama">
                {navLinks.map((link) => (
                  <Link
                    key={link.label + link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-xl px-3.5 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                      isActive(pathname, link.href) && "bg-muted text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {ctaLabel && (
                  <LinkButton href={ctaHref || "/formulir-registrasi"} className="mt-4" onClick={() => setOpen(false)}>
                    {ctaLabel}
                    <ArrowRight />
                  </LinkButton>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

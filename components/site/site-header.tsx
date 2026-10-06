"use client";

import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

/** Tombol ajakan header: ringkas, panahnya bergeser saat disorot. */
function HeaderCta({ href, label, className, onClick }: { href: string; label: string; className?: string; onClick?: () => void }) {
  return (
    <LinkButton href={href} onClick={onClick} className={cn("group h-10 gap-1.5 px-5", className)}>
      {label}
      <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </LinkButton>
  );
}

/**
 * Header mengambang; tingginya (4.25rem) dipakai kelas `hero-under-header`.
 * Di puncak halaman berhero gelap ia transparan (varian `on-hero`), selebihnya kaca terang.
 */
export function SiteHeader({ brandName, brandHighlight, logoUrl, navLinks, ctaLabel, ctaHref }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cta = ctaHref || "/formulir-registrasi";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-at-top={!scrolled} className="sticky top-0 z-40 px-3 pt-3">
      <div
        className={cn(
          "mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-foreground/[0.07] bg-white/85 pr-2 pl-4 text-foreground shadow-[0_10px_32px_-16px_rgba(15,23,42,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow,color] duration-300 sm:pl-5",
          "on-hero:border-transparent on-hero:bg-transparent on-hero:text-white on-hero:shadow-none on-hero:backdrop-blur-none on-hero:backdrop-saturate-100",
        )}
      >
        {/* `flex` menghilangkan ruang baris di bawah logo, yang membuatnya tampak naik dari tengah bar. */}
        <Link href="/" aria-label={`${brandName} — beranda`} className="flex shrink-0 items-center">
          <Brand name={brandName} highlight={brandHighlight} logoUrl={logoUrl} highlightClassName="on-hero:from-sky-300 on-hero:to-brand" />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Menu utama">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.label + link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-[13px] font-medium whitespace-nowrap text-foreground/65 transition-colors hover:bg-foreground/[0.05] hover:text-foreground on-hero:text-white/75 on-hero:hover:bg-white/10 on-hero:hover:text-white",
                  active &&
                    "bg-brand-soft text-brand-ink hover:bg-brand-soft hover:text-brand-ink on-hero:bg-white/15 on-hero:text-white on-hero:hover:bg-white/15",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {ctaLabel && <HeaderCta href={cta} label={ctaLabel} className="hidden sm:inline-flex" />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full border border-foreground/10 text-foreground transition-colors hover:bg-foreground/[0.05] lg:hidden on-hero:border-white/20 on-hero:text-white on-hero:hover:bg-white/10"
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
                      isActive(pathname, link.href) && "bg-brand-soft text-brand-ink hover:bg-brand-soft hover:text-brand-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {ctaLabel && <HeaderCta href={cta} label={ctaLabel} className="mt-4 h-11" onClick={() => setOpen(false)} />}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

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

/** Tombol ajakan header: gradasi biru dengan panah di dalam lingkaran kaca. */
function HeaderCta({ href, label, className, onClick }: { href: string; label: string; className?: string; onClick?: () => void }) {
  return (
    <LinkButton
      href={href}
      onClick={onClick}
      className={cn("h-11 gap-2.5 bg-[linear-gradient(135deg,#4c8dff,#1f4fe0)] pr-1.5 pl-5 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.9)]", className)}
    >
      {label}
      <span className="flex size-8 items-center justify-center rounded-full bg-white/20">
        <ArrowRight />
      </span>
    </LinkButton>
  );
}

/** Header kaca mengambang; tingginya (4.75rem) dipakai kelas `hero-under-header`. */
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
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div
        className={cn(
          "relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-white/10 pr-2.5 pl-5 text-white backdrop-blur-2xl transition-[background-color,box-shadow] duration-300 sm:pl-6",
          // Garis cahaya tipis di tepi atas memberi kesan kaca.
          "before:pointer-events-none before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent",
          scrolled ? "bg-ink/85 shadow-[0_20px_44px_-20px_rgba(2,6,23,0.8)]" : "bg-ink/40 shadow-[0_12px_32px_-20px_rgba(2,6,23,0.7)]",
        )}
      >
        <Link href="/" aria-label={`${brandName} — beranda`}>
          <Brand name={brandName} highlight={brandHighlight} logoUrl={logoUrl} inverted />
        </Link>

        <nav className="hidden items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1 lg:flex" aria-label="Menu utama">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.label + link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white",
                  active && "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-white/[0.12]",
                )}
              >
                {active && <span className="size-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.7)]" aria-hidden="true" />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {ctaLabel && <HeaderCta href={cta} label={ctaLabel} className="hidden sm:inline-flex" />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white lg:hidden"
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
                {ctaLabel && <HeaderCta href={cta} label={ctaLabel} className="mt-4" onClick={() => setOpen(false)} />}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

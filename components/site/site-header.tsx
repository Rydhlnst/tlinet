"use client";

import { Menu } from "lucide-react";
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

export function SiteHeader({ brandName, brandHighlight, logoUrl, navLinks, ctaLabel, ctaHref }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-xl transition-colors",
        scrolled && "border-border",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${brandName} — beranda`}>
          <Brand name={brandName} highlight={brandHighlight} logoUrl={logoUrl} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu utama">
          {navLinks.map((link) => (
            <Link
              key={link.label + link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground xl:px-3.5",
                isActive(pathname, link.href) && "bg-muted text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {ctaLabel && (
            <LinkButton href={ctaHref || "/formulir-registrasi"} className="hidden h-10 sm:inline-flex">
              {ctaLabel}
            </LinkButton>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full border bg-background lg:hidden"
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

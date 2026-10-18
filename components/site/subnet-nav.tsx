"use client";

import { ChevronLeft, Gauge, House, Package, ReceiptText, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { initials } from "@/components/admin/detail-panels";
import { cn } from "@/lib/utils";

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/subnet", label: "Beranda", icon: House },
  { href: "/subnet/trafik", label: "Koneksi", icon: Gauge },
  { href: "/subnet/tagihan", label: "Tagihan", icon: ReceiptText },
  { href: "/subnet/layanan", label: "Layanan", icon: Package },
  { href: "/subnet/profil", label: "Profil", icon: UserRound },
];

const isActive = (pathname: string, href: string) => (href === "/subnet" ? pathname === href : pathname.startsWith(href));

/** Jumlah invoice yang belum dibayar, ditampilkan sebagai lencana di tab Tagihan. */
function UnpaidBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.625rem] leading-none font-semibold text-white tabular-nums", className)}>
      {count > 9 ? "9+" : count}
      <span className="sr-only"> invoice belum dibayar</span>
    </span>
  );
}

/** Tab portal di header untuk layar lebar. */
export function SubnetTopNav({ unpaid }: { unpaid: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 rounded-full bg-muted p-1" aria-label="Menu portal">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <Icon className="size-4" />
            {label}
            {href === "/subnet/tagihan" && <UnpaidBadge count={unpaid} />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Navigasi bawah mengambang ala aplikasi untuk HP (dan aplikasi Android), di atas bilah gestur sistem. */
export function SubnetBottomNav({ unpaid }: { unpaid: number }) {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 md:hidden" aria-label="Menu portal">
      <ul className="mx-auto mb-3 grid h-16 max-w-md grid-cols-5 rounded-[1.75rem] border bg-background/90 px-1 shadow-lg shadow-ink/10 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium select-none [-webkit-tap-highlight-color:transparent]", active ? "text-foreground" : "text-muted-foreground")}
              >
                <span className={cn("relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200", active && "bg-ink text-white")}>
                  <Icon className="size-[1.15rem]" strokeWidth={active ? 2.3 : 2} />
                  {href === "/subnet/tagihan" && <UnpaidBadge count={unpaid} className="absolute -top-1 right-0.5 ring-2 ring-background" />}
                </span>
                <span className={cn(active && "font-semibold")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const titles: [prefix: string, title: string][] = [
  ["/subnet/trafik/grafik", "Grafik MRTG"],
  ["/subnet/trafik", "Koneksi"],
  ["/subnet/tagihan", "Tagihan"],
  ["/subnet/layanan", "Layanan"],
  ["/subnet/profil", "Profil"],
];

/** Bilah atas di HP: logo di Beranda, judul halaman di tab lain, dan foto profil di kanan. */
export function SubnetMobileBar({ brand, name, photoUrl }: { brand: ReactNode; name: string; photoUrl: string }) {
  const pathname = usePathname();
  const title = titles.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const nested = pathname.startsWith("/subnet/trafik/");

  return (
    <header className="pt-safe sticky top-0 z-40 bg-muted/85 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        {title ? (
          <div className="flex min-w-0 items-center gap-1">
            {nested && (
              <Link href="/subnet/trafik" aria-label="Kembali ke Koneksi" className="-ml-2 flex size-9 items-center justify-center rounded-full hover:bg-background">
                <ChevronLeft className="size-5" />
              </Link>
            )}
            <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
          </div>
        ) : (
          <Link href="/subnet" aria-label="Beranda portal">
            {brand}
          </Link>
        )}
        {/* Di Beranda foto profil sudah tampil di kartu sambutan. */}
        {title && (
          <Link href="/subnet/profil" aria-label="Profil saya" className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-secondary-foreground ring-2 ring-background">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="size-full object-cover" />
            ) : (
              initials(name)
            )}
          </Link>
        )}
      </div>
    </header>
  );
}

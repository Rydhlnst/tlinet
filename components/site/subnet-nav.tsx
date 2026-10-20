"use client";

import { ChevronLeft, Gauge, House, MessagesSquare, Package, ReceiptText, UserRound, type LucideIcon } from "lucide-react";
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
    <nav className="flex h-16 items-stretch gap-6" aria-label="Menu portal">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-2 border-b-2 text-sm font-medium transition-colors", active ? "border-white text-white" : "border-transparent text-white/70 hover:text-white")}
          >
            <Icon className="size-4" />
            {label}
            {href === "/subnet/tagihan" && <UnpaidBadge count={unpaid} className="ring-2 ring-brand" />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Navigasi bawah untuk HP (dan aplikasi Android): bilah datar selebar layar di atas bilah gestur sistem. */
export function SubnetBottomNav({ unpaid }: { unpaid: number }) {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden" aria-label="Menu portal">
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium select-none [-webkit-tap-highlight-color:transparent]",
                  active ? "text-brand-ink" : "text-muted-foreground",
                )}
              >
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-brand" aria-hidden="true" />}
                <span className="relative">
                  <Icon className="size-[1.3rem]" strokeWidth={active ? 2.2 : 1.8} />
                  {href === "/subnet/tagihan" && <UnpaidBadge count={unpaid} className="absolute -top-1.5 -right-2.5 ring-2 ring-background" />}
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
  ["/subnet/progres", "Progres Metro"],
  ["/subnet/tower", "Lokasi Tower"],
  ["/subnet/komunitas", "Komunitas"],
  ["/subnet/trafik", "Koneksi"],
  ["/subnet/tagihan", "Tagihan"],
  ["/subnet/layanan", "Layanan"],
  ["/subnet/profil", "Profil"],
];

/** Bilah atas di HP: logo di Beranda, judul halaman di tab lain, dan foto profil di kanan. Birunya berlanjut ke PortalBand. */
export function SubnetMobileBar({ brand, name, photoUrl }: { brand: ReactNode; name: string; photoUrl: string }) {
  const pathname = usePathname();
  const title = titles.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  // Halaman di luar tab bawah punya tombol kembali ke asalnya.
  const back = pathname.startsWith("/subnet/trafik/") ? { href: "/subnet/trafik", label: "Kembali ke Koneksi" } : ["/subnet/progres", "/subnet/tower", "/subnet/komunitas"].some((path) => pathname.startsWith(path)) ? { href: "/subnet", label: "Kembali ke Beranda" } : null;

  return (
    <header className="pt-safe sticky top-0 z-40 bg-brand text-white md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        {title ? (
          <div className="flex min-w-0 items-center gap-1">
            {back && (
              <Link href={back.href} aria-label={back.label} className="-ml-2 flex size-9 items-center justify-center rounded-full hover:bg-white/10">
                <ChevronLeft className="size-5" />
              </Link>
            )}
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
        ) : (
          <Link href="/subnet" aria-label="Beranda portal">
            {brand}
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {!pathname.startsWith("/subnet/komunitas") && (
            <Link href="/subnet/komunitas" aria-label="Komunitas Subnet" className="flex size-9 items-center justify-center rounded-full hover:bg-white/10">
              <MessagesSquare className="size-5" />
            </Link>
          )}
          <Link href="/subnet/profil" aria-label="Profil saya" className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xs font-semibold text-white ring-2 ring-white/30">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="size-full object-cover" />
            ) : (
              initials(name)
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Pita biru lanjutan bilah atas. Di Beranda lebih tinggi karena ucapan sambutan tampil di atasnya. */
export function PortalBand() {
  const pathname = usePathname();
  return <div className={cn("absolute inset-x-0 top-0 bg-brand", pathname === "/subnet" ? "h-36 md:h-44" : "h-12 md:h-32")} aria-hidden="true" />;
}

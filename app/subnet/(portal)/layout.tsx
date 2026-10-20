import { and, count, eq, ne } from "drizzle-orm";
import { LogOut, MessagesSquare } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { initials } from "@/components/admin/detail-panels";
import { TlinetLogo } from "@/components/site/brand";
import { AppStatusBar } from "@/components/site/app-status-bar";
import { ForumBadge, ForumUnreadProvider } from "@/components/site/forum-unread";
import { PortalBand, SubnetBottomNav, SubnetMobileBar, SubnetTopNav } from "@/components/site/subnet-nav";
import { Button } from "@/components/ui/button";
import { forumUnread } from "@/lib/community";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customers, invoices } from "@/lib/db/schema";
import { requireSubnetUser } from "@/lib/subnet";
import { subnetLogoutAction } from "../actions";

export const metadata: Metadata = { title: "Portal Subnet", robots: { index: false } };

// Halaman memanjang sampai ke balik status bar dan bilah gestur; bilah atas dan navigasi bawah memberi ruangnya sendiri.
export const viewport: Viewport = { viewportFit: "cover" };

/**
 * Kerangka portal pelanggan: header dengan tab (layar lebar), bilah atas dan navigasi bawah (HP dan aplikasi Android).
 * Isinya dibagi menjadi Beranda, Koneksi, Tagihan, Layanan, dan Profil.
 */
export default async function SubnetPortalLayout({ children }: LayoutProps<"/subnet">) {
  const user = await requireSubnetUser();
  const db = requireDb();
  const [settings, [customer], [{ unpaid }], forum] = await Promise.all([
    getContent("settings"),
    db.select({ name: customers.name, photos: customers.photos }).from(customers).where(eq(customers.id, user.customerId)).limit(1),
    db
      .select({ unpaid: count() })
      .from(invoices)
      .where(and(eq(invoices.customerId, user.customerId), ne(invoices.status, "paid"))),
    forumUnread(user.customerId),
  ]);
  const name = customer?.name ?? "";
  const photoUrl = customer?.photos[0] ?? "";
  // Logo dibuat putih di atas biru.
  const brand = <TlinetLogo priority className="h-7 brightness-0 invert" />;

  return (
    <ForumUnreadProvider initial={forum.count}>
      <div className="flex flex-1 flex-col bg-neutral-100">
        <AppStatusBar style="DARK" />
        <SubnetMobileBar brand={brand} name={name} photoUrl={photoUrl} />

        <header className="sticky top-0 z-40 hidden bg-brand text-white md:block">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
            <Link href="/subnet" aria-label={`${settings.brandName} – Beranda portal`}>
              <TlinetLogo priority className="h-8 brightness-0 invert" />
            </Link>
            <SubnetTopNav unpaid={unpaid} />
            <div className="flex items-center gap-2">
              <Link href="/subnet/forum" aria-label="Forum Subnet" title="Forum Subnet" className="relative flex size-9 items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white">
                <MessagesSquare className="size-5" />
                <ForumBadge />
              </Link>
              <Link href="/subnet/profil" aria-label="Profil saya" className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-semibold text-white ring-2 ring-white/30">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  initials(name)
                )}
              </Link>
              <form action={subnetLogoutAction} className="hidden lg:block">
                <Button type="submit" variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">
                  <LogOut />
                  Keluar
                </Button>
              </form>
            </div>
          </div>
        </header>

        <div className="relative flex flex-1 flex-col">
          <PortalBand />
          {/* Di HP isi diberi ruang di bawah supaya tidak tertutup navigasi bawah. */}
          <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-4 pt-4 pb-28 sm:gap-4 md:px-6 md:pt-8 md:pb-12">{children}</main>
        </div>

        <SubnetBottomNav unpaid={unpaid} />
      </div>
    </ForumUnreadProvider>
  );
}

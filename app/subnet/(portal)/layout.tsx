import { and, count, eq, ne } from "drizzle-orm";
import { LogOut } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { initials } from "@/components/admin/detail-panels";
import { Brand } from "@/components/site/brand";
import { SubnetBottomNav, SubnetMobileBar, SubnetTopNav } from "@/components/site/subnet-nav";
import { Button } from "@/components/ui/button";
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
  const [settings, [customer], [{ unpaid }]] = await Promise.all([
    getContent("settings"),
    db.select({ name: customers.name, photos: customers.photos }).from(customers).where(eq(customers.id, user.customerId)).limit(1),
    db
      .select({ unpaid: count() })
      .from(invoices)
      .where(and(eq(invoices.customerId, user.customerId), ne(invoices.status, "paid"))),
  ]);
  const name = customer?.name ?? "";
  const photoUrl = customer?.photos[0] ?? "";
  const brand = <Brand name={settings.brandName} highlight={settings.brandHighlight} logoUrl={settings.logoUrl} className="text-lg" />;

  return (
    <div className="flex flex-1 flex-col bg-muted">
      <SubnetMobileBar brand={brand} name={name} photoUrl={photoUrl} />

      <header className="sticky top-0 z-40 hidden border-b bg-background/90 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/subnet" aria-label={`${settings.brandName} – Beranda portal`}>
            <Brand name={settings.brandName} highlight={settings.brandHighlight} logoUrl={settings.logoUrl} />
          </Link>
          <SubnetTopNav unpaid={unpaid} />
          <div className="flex items-center gap-2">
            <Link href="/subnet/profil" aria-label="Profil saya" className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(name)
              )}
            </Link>
            <form action={subnetLogoutAction} className="hidden lg:block">
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                <LogOut />
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Di HP isi diberi ruang di bawah supaya tidak tertutup navigasi bawah yang mengambang. */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pt-2 pb-32 sm:gap-5 md:px-6 md:pt-8 md:pb-12">{children}</main>

      <SubnetBottomNav unpaid={unpaid} />
    </div>
  );
}

import { eq } from "drizzle-orm";
import { LogOut, MapPin, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerTones, StatusPill } from "@/components/admin/detail-panels";
import { AppDownloadCard } from "@/components/site/app-download";
import { SubnetAddressButton, SubnetPhoto } from "@/components/site/subnet-profile";
import { DetailRows, PageHeading, SectionCard } from "@/components/site/subnet-ui";
import { customerStatusLabels } from "@/lib/cms/entities";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { inAndroidApp, requireSubnetUser } from "@/lib/subnet";
import { subnetLogoutAction } from "../../actions";

export const metadata: Metadata = { title: "Profil · Portal Subnet" };

/** Data pribadi dan alamat pelanggan. Yang bisa diubah pelanggan hanya foto profil dan alamat. */
export default async function SubnetProfilePage() {
  const user = await requireSubnetUser();
  const [customer] = await requireDb().select().from(customers).where(eq(customers.id, user.customerId)).limit(1);
  if (!customer) notFound();
  const inApp = await inAndroidApp();
  const wilayah = [customer.district && `Kec. ${customer.district}`, customer.regency, customer.province].filter(Boolean).join(", ");

  return (
    <>
      <PageHeading title="Profil" description="Data pribadi dan alamat lokasi layanan Anda." />

      <section className="relative isolate overflow-hidden rounded-3xl border bg-card px-5 pt-6 pb-5 text-center shadow-sm shadow-ink/5 md:flex md:items-center md:gap-5 md:text-left">
        <div className="absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-secondary to-transparent md:hidden" aria-hidden="true" />
        <div className="flex justify-center">
          <SubnetPhoto photoUrl={customer.photos[0] ?? ""} name={customer.name} />
        </div>
        <div className="mt-3 min-w-0 md:mt-0">
          <p className="truncate text-xl font-bold tracking-tight">{customer.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex justify-center md:justify-start">
            <StatusPill tone={customerTones[customer.status] ?? "muted"}>{customerStatusLabels[customer.status] ?? customer.status}</StatusPill>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2">
        <SectionCard title="Informasi Pribadi" icon={UserRound}>
          <DetailRows
            items={[
              ["Nama", customer.name],
              ["Perusahaan", customer.company],
              ["No. Telepon", customer.phone],
              ["Email portal", user.email],
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Alamat"
          icon={MapPin}
          action={<SubnetAddressButton value={{ address: customer.address, district: customer.district, regency: customer.regency, province: customer.province }} />}
        >
          <div id="alamat" className="flex scroll-mt-24 flex-col gap-1.5 px-5 pt-2 pb-5 text-sm leading-relaxed">
            {customer.address ? <p className="whitespace-pre-line">{customer.address}</p> : <p className="text-muted-foreground">Alamat lengkap belum diisi.</p>}
            {wilayah && <p className="text-muted-foreground">{wilayah}</p>}
          </div>
        </SectionCard>
      </div>

      {!inApp && <AppDownloadCard className="md:max-w-md" />}

      <form action={subnetLogoutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-3xl border bg-card px-5 py-4 text-sm font-semibold text-destructive shadow-sm transition-colors hover:bg-destructive/5 active:bg-destructive/10 md:w-auto md:px-8"
        >
          <LogOut className="size-4" />
          Keluar dari portal
        </button>
      </form>
    </>
  );
}

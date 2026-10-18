import { eq } from "drizzle-orm";
import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerTones } from "@/components/admin/detail-panels";
import { AppDownloadCard } from "@/components/site/app-download";
import { SubnetAddressButton, SubnetPhoto } from "@/components/site/subnet-profile";
import { DetailRows, PageHeading, SectionCard, StatusDot } from "@/components/site/subnet-ui";
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

      <section className="flex items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="shrink-0">
          <SubnetPhoto photoUrl={customer.photos[0] ?? ""} name={customer.name} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">{customer.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <StatusDot tone={customerTones[customer.status] ?? "muted"} className="mt-1">
            {customerStatusLabels[customer.status] ?? customer.status}
          </StatusDot>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <SectionCard title="Informasi pribadi">
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-card px-5 py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 active:bg-destructive/10 md:w-auto md:px-8"
        >
          <LogOut className="size-4" />
          Keluar dari portal
        </button>
      </form>
    </>
  );
}

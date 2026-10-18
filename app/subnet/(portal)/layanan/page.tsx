import { eq } from "drizzle-orm";
import { FileText, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerTones } from "@/components/admin/detail-panels";
import { CopyButton } from "@/components/site/copy-button";
import { DetailRows, ListRow, PageHeading, SectionCard, StatusDot } from "@/components/site/subnet-ui";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { customerStatusLabels } from "@/lib/cms/entities";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { formatDate, formatRupiah, localPhone, whatsappUrl } from "@/lib/format";
import { requireSubnetUser } from "@/lib/subnet";

export const metadata: Metadata = { title: "Layanan · Portal Subnet" };

/** Paket, data teknis, dokumen kontrak, dan kontak bantuan. */
export default async function SubnetServicePage() {
  const user = await requireSubnetUser();
  const [settings, [customer]] = await Promise.all([getContent("settings"), requireDb().select().from(customers).where(eq(customers.id, user.customerId)).limit(1)]);
  if (!customer) notFound();
  const phone = settings.phone.replace(/[^\d+]/g, "");
  const chat = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, `Halo ${settings.brandName}, saya ${customer.name}${customer.siteId ? ` (Site ID ${customer.siteId})` : ""}. `)
    : "";
  const greeting = `saya ${customer.name}${customer.siteId ? ` (Site ID ${customer.siteId})` : ""}. `;
  const itChat = settings.itSupportWhatsapp ? whatsappUrl(settings.itSupportWhatsapp, `Halo IT Support Jaringan ${settings.brandName}, ${greeting}`) : "";
  const metroChat = settings.metroWhatsapp ? whatsappUrl(settings.metroWhatsapp, `Halo ${settings.brandName}, ${greeting}Saya ingin menanyakan progres pemasangan/upgrade.`) : "";

  return (
    <>
      <PageHeading title="Layanan" description="Paket, data teknis, dan dokumen layanan Anda." />

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-5">
          <div>
            <p className="text-sm text-muted-foreground">Paket internet</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{customer.capacity || "—"}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{customer.vendor || settings.brandName}</p>
          </div>
          <StatusDot tone={customerTones[customer.status] ?? "muted"} className="mt-1 shrink-0">
            {customerStatusLabels[customer.status] ?? customer.status}
          </StatusDot>
        </div>
        <dl className="mx-4 mt-4 mb-4 grid grid-cols-2 gap-3 border-t pt-3 sm:mx-5">
          <div>
            <dt className="text-xs text-muted-foreground">Aktif sejak</dt>
            <dd className="mt-0.5 text-sm font-semibold">{customer.activationDate ? formatDate(customer.activationDate) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Biaya bulanan</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">{customer.monthlyFee ? formatRupiah(customer.monthlyFee) : "—"}</dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <SectionCard title="Data teknis">
          <DetailRows
            items={[
              ["Site ID", customer.siteId],
              ["CID", customer.cid],
              [
                "IP Address",
                customer.ipAddress ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="font-mono text-[13px]">{customer.ipAddress}</span>
                    <CopyButton value={customer.ipAddress} label="" className="px-1.5 py-1 text-muted-foreground hover:text-foreground" />
                  </span>
                ) : (
                  ""
                ),
              ],
              ["VLAN", customer.vlan],
              ["Vendor", customer.vendor],
              ...(customer.accurateNo ? ([["No. Pelanggan", customer.accurateNo]] as [string, string][]) : []),
            ]}
          />
        </SectionCard>

        <div className="flex flex-col gap-3 sm:gap-4">
          <SectionCard title="Dokumen">
            <div id="dokumen" className="scroll-mt-24 divide-y border-t">
              <ListRow href={customer.aosUrl || undefined} external icon={FileText} title="AOS" subtitle={customer.aosUrl ? "Activation of Service" : "Belum tersedia"} />
              <ListRow href={customer.pksUrl || undefined} external icon={FileText} title="PKS" subtitle={customer.pksUrl ? "Perjanjian Kerja Sama" : "Belum tersedia"} />
            </div>
          </SectionCard>

          <SectionCard title="Bantuan">
            <div id="bantuan" className="scroll-mt-24 divide-y border-t">
              {chat && <ListRow href={chat} external icon={WhatsAppIcon} title="Customer Service" subtitle={`${localPhone(settings.whatsappNumber)} · tagihan dan layanan`} />}
              {itChat && <ListRow href={itChat} external icon={WhatsAppIcon} title="IT Support Jaringan" subtitle={`${localPhone(settings.itSupportWhatsapp)} · gangguan dan teknis`} />}
              {metroChat && <ListRow href={metroChat} external icon={WhatsAppIcon} title="Progres Metro" subtitle={`${localPhone(settings.metroWhatsapp)} · pemasangan dan upgrade`} />}
              {phone && <ListRow href={`tel:${phone}`} icon={Phone} title="Telepon" subtitle={settings.phone} />}
              {settings.email && <ListRow href={`mailto:${settings.email}`} icon={Mail} title="Email" subtitle={settings.email} />}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

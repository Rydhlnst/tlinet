import { eq } from "drizzle-orm";
import { ChevronRight, FileText, Headset, Mail, Phone, Router, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { customerTones, StatusPill } from "@/components/admin/detail-panels";
import { CopyButton } from "@/components/site/copy-button";
import { DetailRows, PageHeading, SectionCard } from "@/components/site/subnet-ui";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { customerStatusLabels } from "@/lib/cms/entities";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { formatDate, formatRupiah, localPhone, whatsappUrl } from "@/lib/format";
import { requireSubnetUser } from "@/lib/subnet";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Layanan · Portal Subnet" };

/** Baris aksi berikon: dokumen dan kontak bantuan. */
function ActionRow({
  href,
  icon: Icon,
  title,
  subtitle,
  tone = "brand",
  external,
}: {
  href?: string;
  icon: LucideIcon | typeof WhatsAppIcon;
  title: string;
  subtitle: ReactNode;
  tone?: "brand" | "green";
  external?: boolean;
}) {
  const body = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-secondary-foreground")}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const className = "flex items-center gap-3 px-5 py-3.5";
  if (!href) return <div className={cn(className, "opacity-60")}>{body}</div>;
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cn(className, "transition-colors hover:bg-muted/50 active:bg-muted")}>
      {body}
    </a>
  );
}

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

      <section className="relative isolate overflow-hidden rounded-3xl border bg-card p-5 shadow-sm shadow-ink/5 sm:p-6">
        <div className="absolute -top-20 -right-20 -z-10 size-56 rounded-full bg-brand-soft blur-2xl" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Paket internet</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{customer.capacity || "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{customer.vendor || settings.brandName}</p>
          </div>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-ink text-white">
            <Router className="size-6" />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/70 p-3">
            <p className="text-[11px] text-muted-foreground">Status</p>
            <div className="mt-1">
              <StatusPill tone={customerTones[customer.status] ?? "muted"}>{customerStatusLabels[customer.status] ?? customer.status}</StatusPill>
            </div>
          </div>
          <div className="rounded-2xl bg-muted/70 p-3">
            <p className="text-[11px] text-muted-foreground">Aktif sejak</p>
            <p className="mt-1 text-sm font-semibold">{customer.activationDate ? formatDate(customer.activationDate) : "—"}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-muted/70 p-3 sm:col-span-1">
            <p className="text-[11px] text-muted-foreground">Biaya bulanan</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{customer.monthlyFee ? formatRupiah(customer.monthlyFee) : "—"}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-2">
        <SectionCard title="Data Teknis">
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

        <div className="flex flex-col gap-4 sm:gap-5">
          <SectionCard title="Dokumen">
            <div id="dokumen" className="scroll-mt-24 divide-y pb-1">
              <ActionRow href={customer.aosUrl || undefined} external icon={FileText} title="AOS" subtitle={customer.aosUrl ? "Activation of Service" : "Belum tersedia"} />
              <ActionRow href={customer.pksUrl || undefined} external icon={FileText} title="PKS" subtitle={customer.pksUrl ? "Perjanjian Kerja Sama" : "Belum tersedia"} />
            </div>
          </SectionCard>

          <SectionCard title="Bantuan" icon={Headset}>
            <div id="bantuan" className="scroll-mt-24 divide-y pb-1">
              {chat && <ActionRow href={chat} external icon={WhatsAppIcon} tone="green" title="Customer Service" subtitle={`${localPhone(settings.whatsappNumber)} · tagihan dan layanan`} />}
              {itChat && <ActionRow href={itChat} external icon={WhatsAppIcon} tone="green" title="IT Support Jaringan" subtitle={`${localPhone(settings.itSupportWhatsapp)} · gangguan dan teknis`} />}
              {metroChat && <ActionRow href={metroChat} external icon={WhatsAppIcon} tone="green" title="Progres Metro" subtitle={`${localPhone(settings.metroWhatsapp)} · pemasangan dan upgrade`} />}
              {phone && <ActionRow href={`tel:${phone}`} icon={Phone} title="Telepon" subtitle={settings.phone} />}
              {settings.email && <ActionRow href={`mailto:${settings.email}`} icon={Mail} title="Email" subtitle={settings.email} />}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

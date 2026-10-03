import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { getContent } from "@/lib/data";
import { whatsappUrl } from "@/lib/format";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getContent("settings");
  return (
    <>
      <SiteHeader
        brandName={settings.brandName}
        brandHighlight={settings.brandHighlight}
        logoUrl={settings.logoUrl}
        navLinks={settings.navLinks}
        ctaLabel={settings.navCtaLabel}
        ctaHref={settings.navCtaHref}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <WhatsAppFloat href={whatsappUrl(settings.whatsappNumber, settings.whatsappMessage)} />
    </>
  );
}

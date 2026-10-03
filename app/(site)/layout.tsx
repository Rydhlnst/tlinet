import { JsonLd } from "@/components/site/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { getContent } from "@/lib/data";
import { whatsappUrl } from "@/lib/format";
import { absoluteUrl, siteUrl } from "@/lib/seo";

// Simpan dari dashboard langsung menyegarkan halaman; batas 5 menit ini menjaga agar perubahan
// yang dilakukan langsung di database (di luar dashboard) tetap ikut tampil.
export const revalidate = 300;

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getContent("settings");
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.brandName,
          slogan: settings.tagline,
          description: settings.seoDescription,
          url: siteUrl,
          logo: absoluteUrl(settings.logoUrl || "/icon.svg"),
          email: settings.email,
          telephone: settings.phone,
          address: { "@type": "PostalAddress", streetAddress: settings.address, addressCountry: "ID" },
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: `+${settings.whatsappNumber}`,
            availableLanguage: "Indonesian",
          },
          sameAs: settings.socialLinks.map((link) => link.href).filter((href) => href.startsWith("http")),
        }}
      />
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

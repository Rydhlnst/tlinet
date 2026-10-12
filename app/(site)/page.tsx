import type { Metadata } from "next";
import { AboutSection } from "@/components/site/about-section";
import { LogoSection } from "@/components/site/clients-section";
import { CtaBand } from "@/components/site/cta-band";
import { FaqSection } from "@/components/site/faq-section";
import { HomeHero } from "@/components/site/home-hero";
import { NewsSection } from "@/components/site/news-section";
import { PackageTabs } from "@/components/site/package-tabs";
import { StepsSection } from "@/components/site/steps-section";
import { WhySection } from "@/components/site/why-section";
import { SectionHeading } from "@/components/site/ui";
import { getClients, getContent, getFaqs, getPackageCategories, getPackages, getPublishedArticles } from "@/lib/data";
import { whatsappUrl } from "@/lib/format";
import { Icon } from "@/lib/icons";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getContent("settings");
  return pageMetadata({ description: settings.seoDescription, path: "/" });
}

export default async function HomePage() {
  const [settings, home, about, news, categories, packages, faqs, clients, articles] = await Promise.all([
    getContent("settings"),
    getContent("home"),
    getContent("about"),
    getContent("news"),
    getPackageCategories(),
    getPackages(),
    getFaqs(),
    getClients(),
    getPublishedArticles(),
  ]);
  const { hero, features, steps } = home;
  const homeFaqs = faqs.filter((faq) => faq.showOnHome);
  const partnerLogos = clients.filter((item) => item.type === "partner");
  const clientLogos = clients.filter((item) => item.type !== "partner");
  // Ilustrasi langkah "pilih paket" memakai kecepatan tiga paket pertama dari kategori pertama.
  const stepSpeeds = packages.filter((item) => item.categoryId === categories[0]?.id).slice(0, 3).map((item) => item.speed);

  return (
    <>
      <HomeHero hero={hero} />

      <section className="container-page py-20 sm:py-24">
        <SectionHeading {...features} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.items.map((item) => (
            <article key={item.title} className="group rounded-3xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon name={item.icon} className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <AboutSection who={about.who} />

      <section id="produk-layanan" className="border-y bg-muted/40">
        <div className="container-page py-20 sm:py-24">
          <SectionHeading {...home.packages} />
          <div className="mt-12">
            <PackageTabs categories={categories} packages={packages} />
          </div>
          {home.packages.note && <p className="mt-8 text-center text-xs text-muted-foreground">{home.packages.note}</p>}
        </div>
      </section>

      <WhySection why={home.why} />

      <StepsSection steps={steps} speeds={stepSpeeds} />

      <NewsSection content={home.news} articles={articles} readMoreLabel={news.readMoreLabel} />

      {homeFaqs.length > 0 && (
        <FaqSection content={home.faq} faqs={homeFaqs} helpHref={whatsappUrl(settings.whatsappNumber, settings.whatsappMessage)} />
      )}

      {partnerLogos.length > 0 && <LogoSection content={home.partners} items={partnerLogos} />}

      {clientLogos.length > 0 && <LogoSection content={home.clients} items={clientLogos} muted />}

      <CtaBand settings={settings} />
    </>
  );
}

import type { Metadata } from "next";
import { AboutSection } from "@/components/site/about-section";
import { ClientLogo } from "@/components/site/client-logo";
import { CtaBand } from "@/components/site/cta-band";
import { LinedEyebrow } from "@/components/site/decor";
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

      {clients.length > 0 && (
        <section className="border-t py-16 sm:py-20">
          <div className="container-page flex flex-col items-center gap-4 text-center">
            <LinedEyebrow>{home.clients.eyebrow}</LinedEyebrow>
            <h2 className="max-w-2xl text-2xl leading-snug font-bold sm:text-3xl">{home.clients.title}</h2>
            {home.clients.description && <p className="max-w-xl text-muted-foreground">{home.clients.description}</p>}
          </div>
          <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <ul className="flex w-max animate-marquee items-center gap-4 hover:[animation-play-state:paused] motion-reduce:animate-none">
              {[...clients, ...clients].map((client, index) => (
                <li
                  key={`${client.id}-${index}`}
                  aria-hidden={index >= clients.length}
                  className="flex h-14 shrink-0 items-center rounded-2xl border bg-card px-6 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  <ClientLogo name={client.name} logoUrl={client.logoUrl} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand settings={settings} />
    </>
  );
}

import { ArrowRight, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { FaqList } from "@/components/site/faq-list";
import { HeroVisual } from "@/components/site/hero-visual";
import { NodeField } from "@/components/site/node-field";
import { PackageTabs } from "@/components/site/package-tabs";
import { CmsImage, Eyebrow, LinkButton, SectionHeading, SmartLink } from "@/components/site/ui";
import { getClients, getContent, getFaqs, getPackageCategories, getPackages } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getContent("settings");
  return pageMetadata({ description: settings.seoDescription, path: "/" });
}

export default async function HomePage() {
  const [settings, home, categories, packages, faqs, clients] = await Promise.all([
    getContent("settings"),
    getContent("home"),
    getPackageCategories(),
    getPackages(),
    getFaqs(),
    getClients(),
  ]);
  const { hero, features, why, steps } = home;
  const homeFaqs = faqs.filter((faq) => faq.showOnHome);
  // Dengan foto, hero ditumpuk dan dipusatkan agar foto 16:9 tampil utuh; tanpa foto, teks dan ilustrasi berdampingan.
  const stacked = Boolean(hero.imageUrl);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-soft/70 to-background to-60%">
        <NodeField className="bottom-auto h-[46rem] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />
        <div
          className={cn(
            "container-page relative py-14 lg:py-20",
            stacked ? "flex flex-col items-center gap-12 text-center" : "grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24",
          )}
        >
          <div className={cn("flex flex-col gap-6", stacked ? "max-w-3xl items-center" : "items-start")}>
            {hero.badge && (
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand" />
                </span>
                {hero.badge}
              </span>
            )}
            <h1 className="text-[2.6rem] leading-[1.05] font-semibold sm:text-6xl">{hero.title}</h1>
            <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">{hero.description}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {hero.primaryLabel && (
                <LinkButton href={hero.primaryHref || "/area-jangkauan"} className="h-12 px-6">
                  {hero.primaryLabel}
                  <ArrowRight />
                </LinkButton>
              )}
              {hero.secondaryLabel && (
                <LinkButton href={hero.secondaryHref || "/bantuan"} variant="outline" className="h-12 px-6">
                  {hero.secondaryLabel}
                </LinkButton>
              )}
            </div>
            {hero.highlights.length > 0 && (
              <ul className={cn("flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground", stacked && "justify-center")}>
                {hero.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CircleCheck className="size-4 text-brand-ink" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <HeroVisual stats={hero.stats} imageUrl={hero.imageUrl} alt={hero.title} />
        </div>
      </section>

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

      <section id="produk-layanan" className="border-y bg-muted/40">
        <div className="container-page py-20 sm:py-24">
          <SectionHeading {...home.packages} />
          <div className="mt-12">
            <PackageTabs categories={categories} packages={packages} />
          </div>
          {home.packages.note && <p className="mt-8 text-center text-xs text-muted-foreground">{home.packages.note}</p>}
        </div>
      </section>

      <section className="container-page grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div className="flex flex-col items-start gap-8">
          <SectionHeading {...why} align="left" />
          {why.ctaLabel && (
            <LinkButton href={why.ctaHref || "/tentang-kami"} variant="outline">
              {why.ctaLabel}
              <ArrowRight />
            </LinkButton>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {why.items.map((item) => (
            <div key={item.title} className="rounded-3xl border bg-card p-6">
              <p className="text-4xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-4 font-medium">{item.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="container-page py-20 sm:py-24">
          <SectionHeading {...steps} />
          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.items.map((item, index) => (
              <li key={item.title} className="relative rounded-3xl border bg-card p-7">
                <span className="font-mono text-sm font-medium text-brand-ink">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-8 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                {index < steps.items.length - 1 && (
                  <ArrowRight className="absolute top-7 right-7 hidden size-4 text-muted-foreground/50 md:block" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
          {steps.ctaLabel && (
            <div className="mt-10 flex justify-center">
              <LinkButton href={steps.ctaHref || "/area-jangkauan"}>
                {steps.ctaLabel}
                <ArrowRight />
              </LinkButton>
            </div>
          )}
        </div>
      </section>

      {homeFaqs.length > 0 && (
        <section className="container-page py-20 sm:py-24">
          <SectionHeading {...home.faq} />
          <div className="mx-auto mt-12 max-w-3xl">
            <FaqList faqs={homeFaqs} />
            {home.faq.ctaLabel && (
              <div className="mt-8 flex justify-center">
                <SmartLink
                  href={home.faq.ctaHref || "/bantuan"}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
                >
                  {home.faq.ctaLabel}
                  <ArrowRight className="size-4" />
                </SmartLink>
              </div>
            )}
          </div>
        </section>
      )}

      {clients.length > 0 && (
        <section className="border-t py-16">
          <div className="container-page flex flex-col items-center gap-3 text-center">
            <Eyebrow>{home.clients.eyebrow}</Eyebrow>
            <h2 className="max-w-xl text-xl font-semibold sm:text-2xl">{home.clients.title}</h2>
            {home.clients.description && <p className="max-w-xl text-sm text-muted-foreground">{home.clients.description}</p>}
          </div>
          <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <ul className="flex w-max animate-marquee items-center gap-4 hover:[animation-play-state:paused] motion-reduce:animate-none">
              {[...clients, ...clients].map((client, index) => (
                <li
                  key={`${client.id}-${index}`}
                  aria-hidden={index >= clients.length}
                  className="flex h-14 shrink-0 items-center rounded-2xl border bg-card px-6 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {client.logoUrl ? <CmsImage src={client.logoUrl} alt={client.name} className="h-7 w-auto object-contain" /> : client.name}
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

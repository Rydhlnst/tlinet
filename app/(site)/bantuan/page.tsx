import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero, SmartLink } from "@/components/site/ui";
import { getContent, getFaqs } from "@/lib/data";
import { resolveHref, whatsappUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { Icon } from "@/lib/icons";

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getContent("help");
  return pageMetadata({ title: "Bantuan & FAQ", description: hero.description, path: "/bantuan" });
}

export default async function HelpPage() {
  const [settings, help, faqs] = await Promise.all([getContent("settings"), getContent("help"), getFaqs()]);
  const whatsapp = whatsappUrl(settings.whatsappNumber, settings.whatsappMessage);

  return (
    <>
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }}
        />
      )}
      <PageHero {...help.hero} />

      <section className="container-page relative z-10 -mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {help.quickLinks.map((item) => (
          <SmartLink
            key={item.title}
            href={resolveHref(item.href, whatsapp)}
            className="group flex flex-col rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 transition-all hover:-translate-y-0.5 hover:border-brand/40"
          >
            <span className="flex items-start justify-between">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon name={item.icon} className="size-5" />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
            </span>
            <span className="mt-5 font-semibold">{item.title}</span>
            <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</span>
          </SmartLink>
        ))}
      </section>

      <section id="faq" className="container-page py-20 sm:py-24">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">{help.faq.title}</h2>
          {help.faq.description && <p className="text-base text-muted-foreground sm:text-lg">{help.faq.description}</p>}
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <FaqList faqs={faqs} categories={help.faq.categories} allLabel={help.faq.allLabel} />
        </div>
      </section>

      <CtaBand settings={settings} />
    </>
  );
}

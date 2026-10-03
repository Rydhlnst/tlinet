import { Check, Eye, Target } from "lucide-react";
import type { Metadata } from "next";
import { AboutSection } from "@/components/site/about-section";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { getContent } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getContent("about");
  return pageMetadata({ title: "Tentang Kami", description: hero.description, path: "/tentang-kami" });
}

export default async function AboutPage() {
  const [settings, about] = await Promise.all([getContent("settings"), getContent("about")]);
  const { who, vision, mission, values } = about;

  return (
    <>
      <PageHero {...about.hero} />

      <AboutSection who={who} />

      <section className="border-y bg-muted/40">
        <div className="container-page grid gap-5 py-20 sm:py-24 lg:grid-cols-2">
          <article className="rounded-3xl border bg-card p-8">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
              <Eye className="size-5" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold">{vision.title}</h2>
            <p className="mt-3 leading-relaxed text-pretty text-muted-foreground">{vision.body}</p>
          </article>
          <article className="rounded-3xl border bg-card p-8">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
              <Target className="size-5" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold">{mission.title}</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {mission.items.map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground">
                  <Check className="mt-1 size-4 shrink-0 text-brand-ink" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="container-page pt-20 sm:pt-24">
        <SectionHeading {...values} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.items.map((item) => (
            <article key={item.title} className="rounded-3xl border bg-card p-6">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white">
                <Icon name={item.icon} className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBand settings={settings} />
    </>
  );
}

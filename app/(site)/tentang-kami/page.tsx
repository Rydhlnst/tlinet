import { Check, Eye, Target } from "lucide-react";
import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { CmsImage, Eyebrow, PageHero, SectionHeading } from "@/components/site/ui";
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
  const paragraphs = who.body.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <PageHero {...about.hero} />

      <section className="container-page grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <Eyebrow>{who.eyebrow}</Eyebrow>
          <h2 className="text-3xl leading-[1.15] font-semibold sm:text-4xl">{who.title}</h2>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-pretty text-muted-foreground">
              {paragraph}
            </p>
          ))}
          {who.highlights.length > 0 && (
            <dl className="mt-3 grid w-full gap-4 sm:grid-cols-2">
              {who.highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border bg-card p-5">
                  <dt className="text-xl font-semibold tracking-tight">{item.title}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{item.description}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="relative isolate flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-[2rem] surface-ink p-6 text-white sm:min-h-[30rem] sm:p-8">
          {who.imageUrl ? (
            <>
              <CmsImage src={who.imageUrl} alt={who.cardTitle} className="absolute inset-0 -z-10 size-full object-cover" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/40 to-transparent" aria-hidden="true" />
            </>
          ) : (
            <div className="absolute inset-0 -z-10" aria-hidden="true">
              <div className="bg-grid-dark absolute inset-0" />
              <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" fill="none" preserveAspectRatio="xMidYMid slice">
                <g stroke="white" strokeOpacity="0.14">
                  <path d="M40 300 L130 190 L230 240 L330 110" />
                  <path d="M130 190 L170 80 L330 110" />
                  <path d="M230 240 L300 320" />
                </g>
                <g fill="oklch(0.75 0.14 240)">
                  {[
                    [40, 300],
                    [130, 190],
                    [230, 240],
                    [330, 110],
                    [170, 80],
                    [300, 320],
                  ].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />
                  ))}
                </g>
              </svg>
            </div>
          )}
          <h3 className="text-xl font-semibold">{who.cardTitle}</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">{who.cardDescription}</p>
        </div>
      </section>

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

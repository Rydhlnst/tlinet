import { ArrowRight, ChartNoAxesColumn, Wifi } from "lucide-react";
import type { AboutContent } from "@/lib/content/types";
import { Icon } from "@/lib/icons";
import { AccentText, LinedEyebrow, SectionBackdrop } from "./decor";
import { SulawesiMap } from "./sulawesi-map";
import { CmsImage, SmartLink } from "./ui";

const highlightIcons = ["signal", "headset", "shield", "zap"];

/** Bagian "Siapa Kami": profil di kiri, kartu peta jaringan Sulawesi di kanan. Dipakai di beranda dan halaman Tentang Kami. */
export function AboutSection({ who }: { who: AboutContent["who"] }) {
  const paragraphs = who.body.split(/\n\s*\n/).filter(Boolean);

  return (
    <section className="relative overflow-hidden">
      <SectionBackdrop />
      <div className="container-page relative grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div className="flex flex-col items-start gap-5">
          <LinedEyebrow align="left">{who.eyebrow}</LinedEyebrow>
          <h2 className="text-3xl leading-[1.12] font-bold sm:text-4xl lg:text-[2.75rem]">
            <AccentText text={who.title} accent={who.titleAccent} />
          </h2>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-pretty text-muted-foreground">
              {paragraph}
            </p>
          ))}

          {who.features.length > 0 && (
            <ul data-reveal-stagger className="mt-2 grid w-full grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              {who.features.map((item) => (
                <li key={item.title} className="flex flex-col items-start gap-2">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-primary ring-1 ring-primary/10">
                    <Icon name={item.icon} className="size-5" />
                  </span>
                  <span className="text-sm leading-tight font-bold">{item.title}</span>
                  <span className="-mt-1 text-xs text-muted-foreground">{item.description}</span>
                </li>
              ))}
            </ul>
          )}

          {who.highlights.length > 0 && (
            <ul data-reveal-stagger className="mt-2 grid w-full gap-4 sm:grid-cols-2">
              {who.highlights.map((item, index) => (
                <li key={item.title} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-md shadow-primary/5 ring-1 ring-border">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                    <Icon name={item.icon || highlightIcons[index % highlightIcons.length]} className="size-6" />
                  </span>
                  <div>
                    <p className="text-xl font-extrabold tracking-tight">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative pb-8 sm:pr-6">
          <div className="surface-ink relative isolate min-h-[30rem] overflow-hidden rounded-[2rem] p-5 text-white shadow-2xl shadow-ink/30 sm:min-h-[34rem] sm:p-7">
            {who.imageUrl ? (
              <>
                <CmsImage src={who.imageUrl} alt={who.cardTitle} sizes="(min-width: 1024px) 40vw, 100vw" className="absolute inset-0 -z-10 size-full object-cover" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink via-ink/50 to-transparent" aria-hidden="true" />
              </>
            ) : (
              <>
                <div className="bg-grid-dark absolute inset-0 -z-10" aria-hidden="true" />
                <SulawesiMap labels className="absolute top-[7%] right-[-5%] -z-10 h-[82%] w-[72%]" />
              </>
            )}
            <div className="w-full max-w-[13.5rem] rounded-2xl border border-white/15 bg-ink/40 p-5 backdrop-blur-md">
              <ChartNoAxesColumn className="size-7 text-sky-300" />
              <h3 className="mt-3 text-lg leading-snug font-bold">{who.cardTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{who.cardDescription}</p>
            </div>
          </div>

          {who.bannerTitle && (
            <SmartLink
              href={who.bannerHref || "/area-jangkauan"}
              className="group absolute right-0 bottom-0 flex w-[min(100%,24rem)] items-center gap-4 rounded-2xl border border-white/15 bg-ink/85 p-4 text-white shadow-xl shadow-ink/40 backdrop-blur-md transition-transform hover:-translate-y-0.5"
            >
              <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(150deg,#5b9bff,#1f3fd6)]">
                <Wifi className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug font-bold">{who.bannerTitle}</span>
                <span className="mt-0.5 block text-xs text-white/65">{who.bannerDescription}</span>
              </span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/25 transition-colors group-hover:border-white/60">
                <ArrowRight className="size-4.5" />
              </span>
            </SmartLink>
          )}
        </div>
      </div>
    </section>
  );
}

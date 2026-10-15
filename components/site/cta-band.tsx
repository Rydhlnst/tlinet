import { ArrowRight } from "lucide-react";
import type { SiteSettings } from "@/lib/content/types";
import { whatsappUrl } from "@/lib/format";
import { WhatsAppIcon } from "./whatsapp-float";
import { LinkButton } from "./ui";

/** Ajakan penutup yang dipakai di bagian bawah halaman publik. */
export function CtaBand({ settings }: { settings: SiteSettings }) {
  const { cta } = settings;
  return (
    <section className="container-page py-20 sm:py-24">
      <div data-reveal className="relative overflow-hidden rounded-[2rem] surface-ink px-6 py-16 text-center text-white sm:px-16 sm:py-20">
        <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
          {cta.eyebrow && (
            <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">
              {cta.eyebrow}
            </span>
          )}
          <h2 className="text-3xl leading-[1.15] font-semibold sm:text-4xl">{cta.title}</h2>
          <p className="text-base leading-relaxed text-pretty text-white/70 sm:text-lg">{cta.description}</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            {cta.primaryLabel && (
              <LinkButton href={cta.primaryHref || "/area-jangkauan"} variant="white">
                {cta.primaryLabel}
                <ArrowRight />
              </LinkButton>
            )}
            {cta.secondaryLabel && (
              <LinkButton href={whatsappUrl(settings.whatsappNumber, settings.whatsappMessage)} variant="glass">
                <WhatsAppIcon className="size-4" />
                {cta.secondaryLabel}
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

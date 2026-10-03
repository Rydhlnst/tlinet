import { ArrowRight } from "lucide-react";
import type { HomeContent } from "@/lib/content/types";
import { Icon } from "@/lib/icons";
import { SectionBackdrop } from "./decor";
import { CmsImage, LinkButton, SectionHeading } from "./ui";

/** Ilustrasi bawaan tiap kartu (urut: serat optik, perisai, headset, peta Sulawesi); bisa diganti dari CMS. */
const fallbackImages = ["/images/why/fiber.webp", "/images/why/shield.webp", "/images/why/headset.webp", "/images/why/sulawesi.webp"];
const fallbackIcons = ["zap", "shield", "headset", "map-pin"];

/** Bagian "kualitas jaringan": judul di kiri, empat kartu angka berilustrasi di kanan. */
export function WhySection({ why }: { why: HomeContent["why"] }) {
  return (
    <section className="relative overflow-hidden">
      <SectionBackdrop />
      <div className="container-page relative grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.25fr] lg:gap-14">
        <div className="flex flex-col items-start gap-8">
          <SectionHeading eyebrow={why.eyebrow} title={why.title} titleAccent={why.titleAccent} description={why.description} align="left" />
          {why.ctaLabel && (
            <LinkButton href={why.ctaHref || "/tentang-kami"} className="h-12 px-7">
              {why.ctaLabel}
              <ArrowRight />
            </LinkButton>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {why.items.map((item, index) => (
            <article
              key={item.title}
              className="relative isolate overflow-hidden rounded-3xl bg-white p-7 shadow-lg shadow-primary/5 ring-1 ring-border transition-transform hover:-translate-y-1"
            >
              {/* Gambar berlatar terang: digandakan (multiply) ke kartu putih dan dipudarkan melingkar agar tanpa batas kotak. */}
              <CmsImage
                src={item.imageUrl || fallbackImages[index % fallbackImages.length]}
                alt=""
                className="pointer-events-none absolute top-3 right-1 -z-10 h-auto max-h-[70%] w-[44%] max-w-40 object-contain mix-blend-multiply [mask-image:radial-gradient(closest-side,black_62%,transparent)]"
              />
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-primary ring-1 ring-primary/10">
                <Icon name={item.icon || fallbackIcons[index % fallbackIcons.length]} className="size-5.5" />
              </span>
              <p className="mt-5 text-[2.75rem] leading-none font-extrabold tracking-tight">{item.value}</p>
              <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
              <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

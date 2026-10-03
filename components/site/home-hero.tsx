import { ArrowRight } from "lucide-react";
import Image from "next/image";
import type { HomeContent } from "@/lib/content/types";
import { Icon } from "@/lib/icons";
import { NodeField } from "./node-field";
import { CmsImage, LinkButton, SmartLink } from "./ui";

/** Hero beranda: foto latar penuh yang digelapkan di sisi kiri, statistik, dan kartu segmen pelanggan. */
export function HomeHero({ hero }: { hero: HomeContent["hero"] }) {
  const { imageUrl } = hero;

  return (
    <section className="hero-under-header relative isolate overflow-hidden bg-ink text-white">
      {imageUrl &&
        // Gambar lokal (public/ atau /media) dioptimalkan Next; URL luar ditampilkan apa adanya.
        (imageUrl.startsWith("/") ? (
          <Image src={imageUrl} alt="" fill preload fetchPriority="high" sizes="100vw" className="-z-20 object-cover object-[85%_50%]" />
        ) : (
          <CmsImage src={imageUrl} alt="" loading="eager" fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover object-[85%_50%]" />
        ))}
      {/* Di layar lebar hanya sisi kiri yang digelapkan; di layar kecil teks menutupi seluruh foto. */}
      <div
        className="absolute inset-0 -z-10 bg-ink/80 lg:bg-transparent lg:bg-[linear-gradient(90deg,var(--ink)_10%,color-mix(in_oklch,var(--ink)_90%,transparent)_46%,color-mix(in_oklch,var(--ink)_45%,transparent)_74%,color-mix(in_oklch,var(--ink)_22%,transparent)_100%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-ink to-transparent" aria-hidden="true" />
      <NodeField tone="dark" className="-z-10 opacity-70 [mask-image:linear-gradient(to_right,black,transparent_65%)]" />

      <div className="container-page flex flex-col gap-12 pt-14 pb-10 sm:pt-20 lg:pt-24 lg:pb-12">
        <div className="flex max-w-2xl flex-col items-start gap-6">
          {hero.badge && <p className="text-xs font-semibold tracking-[0.28em] text-white/80 uppercase">{hero.badge}</p>}
          <h1 className="text-[2.75rem] leading-[1.04] font-bold sm:text-6xl lg:text-[4.25rem]">
            {hero.title}
            {hero.titleAccent && (
              <span className="block bg-gradient-to-r from-[#3b82ff] to-[#38bdf8] bg-clip-text pb-1 text-transparent">{hero.titleAccent}</span>
            )}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-pretty text-white/80">{hero.description}</p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            {hero.primaryLabel && (
              <LinkButton href={hero.primaryHref || "/formulir-registrasi"} className="h-12 px-7">
                {hero.primaryLabel}
                <ArrowRight />
              </LinkButton>
            )}
            {hero.secondaryLabel && (
              <LinkButton href={hero.secondaryHref || "/bantuan"} variant="glass" className="h-12 px-7">
                {hero.secondaryLabel}
              </LinkButton>
            )}
          </div>
        </div>

        {hero.stats.length > 0 && (
          <dl className="grid max-w-4xl grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:gap-x-0 sm:divide-x sm:divide-white/15">
            {hero.stats.slice(0, 4).map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 sm:px-5 sm:first:pl-0">
                <Icon name={stat.icon || "gauge"} strokeWidth={1.6} className="size-9 shrink-0 text-[#4f8dff]" />
                <div className="flex flex-col-reverse">
                  <dt className="text-xs whitespace-nowrap text-white/70">{stat.label}</dt>
                  <dd className="text-xl font-semibold tracking-tight">{stat.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}

        {hero.segments.length > 0 && (
          <ul className="grid overflow-hidden rounded-3xl border border-white/10 bg-ink/55 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
            {hero.segments.slice(0, 4).map((segment) => (
              <li key={segment.title} className="border-white/10 not-last:border-b sm:not-last:border-b-0 sm:odd:border-r lg:border-r lg:last:border-r-0">
                <SmartLink href={segment.href || "/#produk-layanan"} className="group flex h-full items-center gap-4 px-5 py-5 transition-colors hover:bg-white/5">
                  <Icon name={segment.icon} strokeWidth={1.5} className="size-9 shrink-0 text-white/90" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{segment.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-white/65">{segment.description}</span>
                  </span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors group-hover:border-white/50 group-hover:text-white">
                    <ArrowRight className="size-4" />
                  </span>
                </SmartLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

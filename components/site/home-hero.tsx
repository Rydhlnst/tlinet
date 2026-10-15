import { ArrowRight } from "lucide-react";
import Image from "next/image";
import type { HomeContent } from "@/lib/content/types";
import { Icon } from "@/lib/icons";
import { HeroArcs } from "./hero-arcs";
import { NodeField } from "./node-field";
import { CmsImage, LinkButton, SmartLink } from "./ui";

/** Garis pemisah sel kisi: 2×2 di bawah lg, satu baris empat kolom mulai lg. */
const cellBorders = "border-white/10 odd:border-r max-lg:nth-[-n+2]:border-b lg:border-r lg:last:border-r-0";

/** Hero beranda: foto latar penuh yang digelapkan di sisi kiri, statistik, dan kartu segmen pelanggan. */
export function HomeHero({ hero }: { hero: HomeContent["hero"] }) {
  const { imageUrl } = hero;

  return (
    <section className="hero-under-header relative isolate overflow-hidden bg-ink text-white">
      {/*
        Di layar lebar foto dipasang selebar hero dengan tinggi aslinya (tidak diperbesar), mulai di bawah header,
        dan memudar di tepi atas dan bawah; di layar kecil foto hanya mengisi bagian atas agar tidak diperbesar sampai buram,
        dan pudarnya cukup dari lapisan gelap di atasnya (tanpa mask, yang berat digambar di HP).
      */}
      <div
        className="absolute inset-x-0 top-0 grid h-[38rem] lg:top-14 lg:h-auto lg:min-h-[60%] -z-20 lg:[mask-image:linear-gradient(to_bottom,transparent,black_12%,black_58%,transparent)]"
        aria-hidden="true"
      >
        {imageUrl &&
          // Gambar lokal (public/ atau /media) dioptimalkan Next; URL luar ditampilkan apa adanya.
          (imageUrl.startsWith("/") ? (
            <Image
              src={imageUrl}
              alt=""
              width={1600}
              height={668}
              preload
              fetchPriority="high"
              sizes="100vw"
              className="h-full w-full object-cover object-right"
            />
          ) : (
            <CmsImage src={imageUrl} alt="" loading="eager" fetchPriority="high" sizes="100vw" preload className="h-full w-full object-cover object-right" />
          ))}
        {/* Pengganti mask di HP: tepi bawah foto dilebur ke latar dengan gradien biasa. */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-ink lg:hidden" />
      </div>
      {/* Di layar lebar hanya sisi kiri yang digelapkan; di layar kecil foto digelapkan makin pekat ke bawah. */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/65 via-ink/85 to-ink lg:bg-[linear-gradient(90deg,var(--ink)_8%,color-mix(in_oklch,var(--ink)_90%,transparent)_42%,color-mix(in_oklch,var(--ink)_64%,transparent)_58%,color-mix(in_oklch,var(--ink)_30%,transparent)_78%,color-mix(in_oklch,var(--ink)_16%,transparent)_100%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-ink to-transparent" aria-hidden="true" />
      {/*
        Garis jaringan memakai kotak yang sama dengan foto agar berimpit dengan petanya, tetapi di atas lapisan gelap supaya tetap terlihat.
        Di layar kecil petanya terpotong dan garisnya jatuh di atas teks, jadi disembunyikan.
      */}
      <div className="absolute inset-x-0 top-14 -z-10 hidden min-h-[60%] opacity-90 [mask-image:linear-gradient(to_bottom,black_45%,transparent_80%)] lg:grid" aria-hidden="true">
        <HeroArcs className="h-full w-full" />
      </div>
      {/* Cahaya lembut di pojok kiri atas: gradien melingkar, bukan filter blur yang berat digambar di HP. */}
      <div className="absolute -top-56 -left-56 -z-10 size-[44rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--primary)_28%,transparent),transparent)]" aria-hidden="true" />
      {/* Titik jaringan bergerak hanya di layar lebar; di HP kanvas bertopeng ini berat digambar dan menunda tampilan pertama. */}
      <NodeField tone="dark" className="-z-10 hidden opacity-70 [mask-image:linear-gradient(to_right,black,transparent_65%)] lg:block" />

      <div className="container-page flex flex-col gap-10 pt-12 pb-10 sm:gap-12 sm:pt-20 lg:pt-24 lg:pb-12">
        <div className="flex max-w-2xl flex-col items-start gap-5 sm:gap-6">
          {hero.badge && (
            <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pr-4 pl-3 text-[11px] font-semibold tracking-[0.2em] text-white/85 uppercase backdrop-blur">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400/70 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-sky-400" />
              </span>
              {hero.badge}
            </p>
          )}
          <h1 className="text-[2.75rem] leading-[1.04] font-bold sm:text-6xl lg:text-[4.25rem]">
            {hero.title}
            {hero.titleAccent && (
              <span className="block bg-gradient-to-r from-[#3b82ff] to-[#38bdf8] bg-clip-text pb-1 text-transparent">{hero.titleAccent}</span>
            )}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-pretty text-white/75 sm:text-lg">{hero.description}</p>
          {/* Bersebelahan begitu lebarnya cukup; di ponsel sempit ditumpuk selebar layar. */}
          <div className="flex w-full flex-col gap-3 pt-2 min-[26rem]:w-auto min-[26rem]:flex-row">
            {hero.primaryLabel && (
              <LinkButton href={hero.primaryHref || "/formulir-registrasi"} className="group h-12 px-7">
                {hero.primaryLabel}
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
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
          <ul className="grid max-w-xl grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-ink/45 lg:max-w-4xl lg:grid-cols-4">
            {hero.stats.slice(0, 4).map((stat) => (
              <li
                key={stat.label}
                className={`flex flex-col items-start gap-2.5 px-4 py-4 min-[30rem]:flex-row min-[30rem]:items-center min-[30rem]:gap-3 sm:px-5 ${cellBorders}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#4f8dff]/15 text-[#8ab6ff] ring-1 ring-white/10 ring-inset">
                  <Icon name={stat.icon || "gauge"} strokeWidth={1.7} className="size-5" />
                </span>
                <p className="flex flex-col-reverse">
                  <span className="text-xs whitespace-nowrap text-white/65">{stat.label}</span>
                  <span className="text-xl leading-tight font-semibold tracking-tight">{stat.value}</span>
                </p>
              </li>
            ))}
          </ul>
        )}

        {hero.segments.length > 0 && (
          <ul className="grid grid-cols-2 overflow-hidden rounded-3xl border border-white/10 bg-ink/75 lg:grid-cols-4">
            {hero.segments.slice(0, 4).map((segment) => (
              <li key={segment.title} className={cellBorders}>
                <SmartLink
                  href={segment.href || "/#produk-layanan"}
                  className="group relative flex h-full flex-col gap-3 p-4 transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                >
                  <Icon name={segment.icon} strokeWidth={1.5} className="size-8 shrink-0 text-white/90 sm:size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{segment.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-white/65">{segment.description}</span>
                  </span>
                  <span className="absolute top-4 right-4 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors group-hover:border-white/50 group-hover:text-white sm:static">
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

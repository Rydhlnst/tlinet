import { ArrowRight } from "lucide-react";
import { useId } from "react";
import type { HomeContent } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { LinkButton } from "./ui";

/** Ilustrasi langkah 1: pin lokasi di atas petak peta dengan rumah kecil. */
function PinArt() {
  const id = useId();
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden="true" className="size-full">
      <defs>
        <linearGradient id={`${id}-pin`} x1="70" y1="20" x2="150" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b9bff" />
          <stop offset="1" stopColor="#1f3fd6" />
        </linearGradient>
      </defs>
      {[46, 68, 90].map((radius, index) => (
        <circle key={radius} cx="112" cy="92" r={radius} stroke="#3b82f6" strokeOpacity={0.2 - index * 0.055} strokeWidth="1.5" />
      ))}
      {/* petak peta */}
      <path d="M22 158 112 122 204 158 112 198Z" fill="white" stroke="#c7d8fb" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M58 156 88 144 112 154 82 167Z" fill="#dbe7ff" />
      <path d="M96 172 126 160 150 170 120 183Z" fill="#c9dcff" />
      <path d="M120 140 142 131 164 140 142 150Z" fill="#e6efff" />
      {/* rumah */}
      <path d="M150 150v-24l19-13 19 13v24Z" fill="white" stroke="#bfd2fa" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M144 128 169 110 194 128" stroke="#2f62ea" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="163" y="134" width="12" height="16" rx="2" fill="#2f62ea" />
      {/* pin */}
      <ellipse cx="112" cy="150" rx="20" ry="6" fill="#1f3fd6" fillOpacity="0.18" />
      <path d="M112 148C88 114 74 96 74 76a38 38 0 1 1 76 0c0 20-14 38-38 72Z" fill={`url(#${id}-pin)`} />
      <circle cx="112" cy="76" r="15" fill="white" />
    </svg>
  );
}

/** Ilustrasi langkah 2: tiga kartu paket, yang tengah menonjol. Angkanya diambil dari paket yang tampil di situs. */
function PlansArt({ speeds }: { speeds: string[] }) {
  const cards = [0, 1, 2].map((index) => {
    const [value = "", ...unit] = (speeds[index] ?? ["30 Mbps", "50 Mbps", "100 Mbps"][index]).trim().split(/\s+/);
    return { value: value.slice(0, 5), unit: unit.join(" ").slice(0, 6) };
  });
  const side = "flex h-[5.5rem] w-14 flex-col items-center justify-center rounded-xl bg-white text-ink shadow-md ring-1 ring-ink/5";

  return (
    <div className="relative flex size-full items-center justify-center" aria-hidden="true">
      <span className="absolute bottom-[14%] h-7 w-[88%] rounded-[50%] border-2 border-primary/25" />
      <span className="absolute bottom-[17%] h-4 w-[70%] rounded-[50%] bg-primary/10" />
      <div className="relative flex scale-[0.82] items-center">
        <div className={cn(side, "-mr-2 -rotate-6")}>
          <span className="text-lg leading-none font-extrabold">{cards[0].value}</span>
          <span className="mt-1 text-[9px] font-medium text-muted-foreground">{cards[0].unit}</span>
        </div>
        <div className="z-10 flex h-28 w-16 flex-col items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#5b9bff,#1f3fd6)] text-white shadow-xl shadow-primary/40">
          <span className="text-2xl leading-none font-extrabold">{cards[1].value}</span>
          <span className="mt-1 text-[10px] font-medium text-white/80">{cards[1].unit}</span>
          <span className="mt-3 h-0.5 w-7 rounded-full bg-white/70" />
          <span className="mt-1.5 h-0.5 w-5 rounded-full bg-white/40" />
        </div>
        <div className={cn(side, "-ml-2 rotate-6")}>
          <span className="text-lg leading-none font-extrabold">{cards[2].value}</span>
          <span className="mt-1 text-[9px] font-medium text-muted-foreground">{cards[2].unit}</span>
        </div>
      </div>
    </div>
  );
}

/** Ilustrasi langkah 3: router dengan gelombang Wi-Fi. */
function RouterArt() {
  const id = useId();
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden="true" className="size-full">
      <defs>
        <linearGradient id={`${id}-wave`} x1="80" y1="40" x2="150" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b9bff" />
          <stop offset="1" stopColor="#1f3fd6" />
        </linearGradient>
      </defs>
      <circle cx="116" cy="96" r="84" stroke="#3b82f6" strokeOpacity="0.14" strokeWidth="1.5" />
      <g stroke={`url(#${id}-wave)`} strokeWidth="9" strokeLinecap="round">
        <path d="M76 78a56 56 0 0 1 80 0" />
        <path d="M91 94a35 35 0 0 1 50 0" />
        <path d="M106 110a14 14 0 0 1 20 0" />
      </g>
      <ellipse cx="116" cy="196" rx="74" ry="9" fill="#0b1437" fillOpacity="0.1" />
      {/* antena */}
      <rect x="44" y="96" width="9" height="68" rx="4.5" fill="#101a44" transform="rotate(-6 48 160)" />
      <rect x="179" y="96" width="9" height="68" rx="4.5" fill="#101a44" transform="rotate(6 184 160)" />
      {/* badan router */}
      <rect x="36" y="150" width="160" height="42" rx="12" fill="white" stroke="#c7d8fb" strokeWidth="1.5" />
      <rect x="36" y="178" width="160" height="14" rx="7" fill="#eef3ff" />
      <rect x="62" y="167" width="34" height="4" rx="2" fill="#3b82f6" />
      <circle cx="150" cy="169" r="3" fill="#3b82f6" />
      <circle cx="163" cy="169" r="3" fill="#bcd0f7" />
      <circle cx="176" cy="169" r="3" fill="#bcd0f7" />
    </svg>
  );
}

const columns: Record<number, string> = { 1: "max-w-md", 2: "max-w-4xl lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "md:grid-cols-2 xl:grid-cols-4" };

/** Bagian "Cara Berlangganan": kartu langkah bernomor dengan ilustrasi, tombol per langkah, dan panah antar kartu. */
export function StepsSection({ steps, speeds }: { steps: HomeContent["steps"]; speeds: string[] }) {
  // Kata aksen diwarnai di tempatnya; bila tidak ada di dalam judul, judul tampil polos.
  const at = steps.titleAccent ? steps.title.indexOf(steps.titleAccent) : -1;
  const accent = at >= 0 ? steps.titleAccent : "";
  const before = at >= 0 ? steps.title.slice(0, at) : steps.title;
  const after = at >= 0 ? steps.title.slice(at + accent.length) : "";
  const art = [<PinArt key="pin" />, <PlansArt key="plans" speeds={speeds} />, <RouterArt key="router" />];

  return (
    <section className="relative overflow-hidden border-y bg-gradient-to-b from-brand-soft/60 via-background to-brand-soft/40">
      {/* Lengkung tipis di latar, tanpa blur. */}
      <svg viewBox="0 0 1440 600" preserveAspectRatio="none" fill="none" aria-hidden="true" className="absolute inset-0 size-full text-primary/[0.07]">
        <path d="M-40 420C260 300 520 520 800 400S1260 220 1480 330" stroke="currentColor" strokeWidth="1.5" />
        <path d="M-40 470C280 350 540 560 820 450S1270 280 1480 390" stroke="currentColor" strokeWidth="1.5" />
        <path d="M-40 140C220 60 420 200 700 120S1180 20 1480 110" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="container-page relative py-20 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          {steps.eyebrow && (
            <p className="flex items-center gap-4 text-xs font-semibold tracking-[0.2em] text-brand-ink uppercase">
              <span className="h-px w-8 bg-primary/40" aria-hidden="true" />
              {steps.eyebrow}
              <span className="h-px w-8 bg-primary/40" aria-hidden="true" />
            </p>
          )}
          <h2 className="text-3xl leading-[1.12] font-bold sm:text-4xl lg:text-[2.75rem]">
            {before}
            {accent && <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">{accent}</span>}
            {after}
          </h2>
          {steps.description && <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">{steps.description}</p>}
        </div>

        <ol data-reveal-stagger className={cn("mx-auto mt-14 grid gap-6", columns[Math.min(steps.items.length, 4)] ?? columns[3])}>
          {steps.items.map((item, index) => (
            <li key={item.title} className="relative">
              <article className="relative flex h-full min-h-[17.5rem] overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-brand-soft p-7 shadow-lg shadow-primary/5 ring-1 ring-border">
                <div className="relative z-10 flex w-[58%] flex-col items-start">
                  <p className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-ink">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px w-8 bg-primary/30" aria-hidden="true" />
                  </p>
                  <h3 className="mt-6 text-2xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  {item.ctaLabel && (
                    <LinkButton href={item.ctaHref || "/area-jangkauan"} variant="soft" className="mt-6">
                      {item.ctaLabel}
                      <ArrowRight />
                    </LinkButton>
                  )}
                </div>
                <div className="pointer-events-none absolute right-0 bottom-2 h-[72%] w-[44%]">{art[index % art.length]}</div>
              </article>
              {index < steps.items.length - 1 && (
                <span
                  className="absolute top-1/2 -right-3 z-20 hidden size-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-lg ring-1 ring-border lg:flex"
                  aria-hidden="true"
                >
                  <ArrowRight className="size-4.5" />
                </span>
              )}
            </li>
          ))}
        </ol>

        {steps.ctaLabel && (
          <div className="mt-10 flex justify-center">
            <LinkButton href={steps.ctaHref || "/area-jangkauan"} className="h-12 px-8">
              {steps.ctaLabel}
              <ArrowRight />
            </LinkButton>
          </div>
        )}
      </div>
    </section>
  );
}

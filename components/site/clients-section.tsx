import type { HomeContent } from "@/lib/content/types";
import type { Client } from "@/lib/data";
import { LogoShowcase } from "./logo-showcase";
import { NetworkGlobe } from "./network-globe";

const smallLabel = "font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase";

/** Nama panjang disingkat menjadi huruf awal tiap kata ("Asosiasi Penyelenggara Jasa Internet Indonesia" → "APJII") agar muat sebagai label bola. */
const shortName = (name: string) => {
  if (name.length <= 22) return name;
  return name
    .split(/\s+/)
    .filter((word) => word && !/^(dan|di|dari|untuk|of|the|and)$/i.test(word))
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

/** Bagian mitra dan klien beranda: judul dan angka di kiri, bola jaring di kanan, lalu deretan logo per jenis. */
export function NetworkSection({
  partners,
  clients,
  partnerLogos,
  clientLogos,
}: {
  partners: HomeContent["partners"];
  clients: HomeContent["clients"];
  partnerLogos: Client[];
  clientLogos: Client[];
}) {
  const rows = [
    { content: partners, items: partnerLogos, stat: "Mitra terhubung" },
    { content: clients, items: clientLogos, stat: "Klien dilayani" },
  ].filter((row) => row.items.length > 0);
  if (rows.length === 0) return null;

  return (
    <section className="relative isolate overflow-hidden border-t">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden="true" />
      <div className="container-page py-20 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
          <div>
            {partners.eyebrow && <p className={smallLabel}>{partners.eyebrow}</p>}
            <h2 className="mt-6 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              {rows.map((row, index) => (
                <span key={row.stat} className={index === rows.length - 1 ? "block w-fit bg-gradient-to-r from-primary to-sky-500 bg-clip-text pb-1 text-transparent" : "block"}>
                  {row.content.title}
                </span>
              ))}
            </h2>
            {partners.description && <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">{partners.description}</p>}
            <dl className="mt-10 flex flex-wrap gap-x-14 gap-y-6">
              {rows.map((row) => (
                <div key={row.stat} className="flex flex-col-reverse gap-2">
                  <dt className={smallLabel.replace("tracking-[0.3em]", "tracking-[0.2em]")}>{row.stat}</dt>
                  <dd className="text-4xl leading-none font-extrabold text-primary">{row.items.length}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mx-auto aspect-square w-full max-w-sm lg:max-w-none">
            <NetworkGlobe labels={rows.flatMap((row) => row.items.map((item) => shortName(item.name)))} />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-12 sm:mt-20">
          {rows.map((row) => (
            <div key={row.stat}>
              <h3 className={smallLabel}>{row.content.title}</h3>
              <div className="mt-5">
                <LogoShowcase items={row.items} moreLabel={row.content.moreLabel} lessLabel={row.content.lessLabel} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

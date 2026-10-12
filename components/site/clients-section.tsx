import type { HomeContent } from "@/lib/content/types";
import type { Client } from "@/lib/data";
import { cn } from "@/lib/utils";
import { LogoShowcase } from "./logo-showcase";
import { SectionHeading } from "./ui";

/** Bagian logo beranda (mitra atau klien): judul di atas deretan kartu logo. */
export function LogoSection({ content, items, muted = false }: { content: HomeContent["clients"]; items: Client[]; muted?: boolean }) {
  return (
    <section className={cn("py-16 sm:py-20", muted && "bg-muted/50")}>
      <div className="container-page">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} titleAccent={content.titleAccent} description={content.description} />
      </div>
      <div className="mt-10 sm:mt-12">
        <LogoShowcase items={items} moreLabel={content.moreLabel} lessLabel={content.lessLabel} />
      </div>
    </section>
  );
}

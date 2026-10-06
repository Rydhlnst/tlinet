import type { HomeContent } from "@/lib/content/types";
import type { Client } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ClientLogo } from "./client-logo";
import { SectionHeading } from "./ui";

/** Jumlah kartu minimum per putaran, supaya satu putaran selalu lebih lebar dari layar. */
const MIN_PER_LOOP = 10;
/** Mulai jumlah ini klien dibagi ke dua baris yang berjalan berlawanan arah. */
const TWO_ROWS_FROM = 6;

function MarqueeRow({ clients, reverse = false }: { clients: Client[]; reverse?: boolean }) {
  const repeats = Math.ceil(MIN_PER_LOOP / clients.length);
  // Dua putaran identik: animasi menggeser tepat satu putaran lalu mengulang tanpa loncatan.
  const loop = Array.from({ length: repeats * 2 }, () => clients).flat();
  return (
    <ul
      className={cn(
        "flex w-max animate-marquee py-2 hover:[animation-play-state:paused] motion-reduce:animate-none",
        reverse && "[animation-direction:reverse] [animation-duration:48s]",
      )}
    >
      {loop.map((client, index) => (
        <li
          key={`${client.id}-${index}`}
          aria-hidden={index >= clients.length}
          className="mr-4 flex h-16 min-w-44 shrink-0 items-center justify-center gap-3 rounded-2xl border bg-card px-5 shadow-sm shadow-primary/5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
        >
          <ClientLogo name={client.name} logoUrl={client.logoUrl} />
        </li>
      ))}
    </ul>
  );
}

/** Bagian klien beranda: judul di atas deretan logo yang berjalan. */
export function ClientsSection({ content, clients }: { content: HomeContent["clients"]; clients: Client[] }) {
  const split = clients.length >= TWO_ROWS_FROM ? Math.ceil(clients.length / 2) : clients.length;
  const rows = [clients.slice(0, split), clients.slice(split)].filter((row) => row.length > 0);

  return (
    <section className="relative overflow-hidden border-t pt-20 pb-6 sm:pt-24 sm:pb-8">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="container-page relative">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} titleAccent={content.titleAccent} description={content.description} />
      </div>
      <div className="relative mt-12 flex flex-col gap-2 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        {rows.map((row, index) => (
          <MarqueeRow key={index} clients={row} reverse={index % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

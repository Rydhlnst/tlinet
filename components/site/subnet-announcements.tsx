import { Megaphone } from "lucide-react";
import Link from "next/link";
import type { SubnetAnnouncement } from "@/lib/data";

/** Kartu satu pengumuman: poster penuh (ketuk untuk buka ukuran penuh) + judul/keterangan opsional. */
function AnnouncementCard({ item }: { item: SubnetAnnouncement }) {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card">
      {item.imageUrl && (
        <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.title} className="h-auto w-full" />
        </a>
      )}
      {(item.title || item.body) && (
        <figcaption className="px-4 py-3">
          {item.title && <p className="text-sm font-semibold">{item.title}</p>}
          {item.body && <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted-foreground">{item.body}</p>}
        </figcaption>
      )}
    </figure>
  );
}

/** Sorotan di beranda portal: pengumuman terbaru + tautan "lihat semua" bila ada lebih dari satu. */
export function AnnouncementHighlight({ items }: { items: SubnetAnnouncement[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
          <Megaphone className="size-4 text-brand-ink" /> Pemberitahuan
        </h2>
        {items.length > 1 && (
          <Link href="/subnet/pengumuman" className="text-sm font-medium text-brand-ink">
            Lihat semua ({items.length})
          </Link>
        )}
      </div>
      <AnnouncementCard item={items[0]} />
    </section>
  );
}

/** Daftar lengkap pengumuman untuk halaman Pemberitahuan. */
export function AnnouncementList({ items }: { items: SubnetAnnouncement[] }) {
  if (!items.length) return <p className="py-12 text-center text-sm text-muted-foreground">Belum ada pengumuman.</p>;
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <AnnouncementCard key={item.id} item={item} />
      ))}
    </div>
  );
}

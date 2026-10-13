"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import type { Client } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ClientLogo } from "./client-logo";
import { linkButtonClass } from "./ui";

/** Tombol pembuka kisi baru muncul bila logonya lebih dari ini; di bawahnya semua logo sudah terlihat sekaligus. */
const GRID_FROM = 5;
/** Jumlah kartu minimum per putaran, supaya satu putaran selalu lebih lebar dari layar. */
const MIN_PER_LOOP = 8;

const chip =
  "flex h-16 shrink-0 items-center gap-3 rounded-2xl border bg-card pr-5 pl-3 shadow-sm shadow-primary/5 transition-colors hover:border-primary/40";

function Marquee({ items }: { items: Client[] }) {
  const repeats = Math.ceil(MIN_PER_LOOP / items.length);
  // Dua putaran identik: animasi menggeser tepat satu putaran lalu mengulang tanpa loncatan.
  const loop = Array.from({ length: repeats * 2 }, () => items).flat();
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <ul className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:[animation-duration:90s]">
        {loop.map((item, index) => (
          <li key={`${item.id}-${index}`} aria-hidden={index >= items.length} className={cn(chip, "mr-3")}>
            <ClientLogo name={item.name} logoUrl={item.logoUrl} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Deretan logo yang berjalan; bila logonya banyak, bisa dibuka menjadi kisi berisi semuanya. */
export function LogoShowcase({ items, moreLabel, lessLabel }: { items: Client[]; moreLabel: string; lessLabel: string }) {
  const [open, setOpen] = useState(false);
  const expandable = items.length > GRID_FROM && Boolean(moreLabel || lessLabel);

  return (
    <>
      {!open ? (
        <Marquee items={items} />
      ) : (
        <ul className="flex flex-wrap gap-3">
          {items.map((item) => (
            <li key={item.id} className={chip}>
              <ClientLogo name={item.name} logoUrl={item.logoUrl} />
            </li>
          ))}
        </ul>
      )}
      {expandable && (
        <div className="mt-6 flex">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={linkButtonClass("outline", "h-10 px-5")}>
            {open ? lessLabel || moreLabel : moreLabel || lessLabel}
            {open ? <ArrowUp /> : <ArrowDown />}
          </button>
        </div>
      )}
    </>
  );
}

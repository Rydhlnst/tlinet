"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import type { Client } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ClientLogo } from "./client-logo";
import { linkButtonClass } from "./ui";

/** Sampai jumlah ini logo tampil diam di tengah; lebih dari itu berjalan sebagai marquee. */
const STATIC_UP_TO = 5;
/** Jumlah kartu minimum per putaran, supaya satu putaran selalu lebih lebar dari layar. */
const MIN_PER_LOOP = 8;

const card =
  "flex h-24 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border bg-card px-4 shadow-sm shadow-primary/5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 sm:h-32 sm:w-60 sm:px-6";

function Marquee({ items }: { items: Client[] }) {
  const repeats = Math.ceil(MIN_PER_LOOP / items.length);
  // Dua putaran identik: animasi menggeser tepat satu putaran lalu mengulang tanpa loncatan.
  const loop = Array.from({ length: repeats * 2 }, () => items).flat();
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <ul className="flex w-max animate-marquee py-2 hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((item, index) => (
          <li key={`${item.id}-${index}`} aria-hidden={index >= items.length} className={cn(card, "mr-4 sm:mr-7")}>
            <ClientLogo name={item.name} logoUrl={item.logoUrl} variant="card" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Deretan kartu logo: berjalan bila banyak, dan bisa dibuka menjadi kisi berisi semua logo. */
export function LogoShowcase({ items, moreLabel, lessLabel }: { items: Client[]; moreLabel: string; lessLabel: string }) {
  const [open, setOpen] = useState(false);
  const moving = items.length > STATIC_UP_TO;

  return (
    <>
      {moving && !open ? (
        <Marquee items={items} />
      ) : (
        <ul className="container-page flex flex-wrap justify-center gap-4 py-2 sm:gap-7">
          {items.map((item) => (
            <li key={item.id} className={card}>
              <ClientLogo name={item.name} logoUrl={item.logoUrl} variant="card" />
            </li>
          ))}
        </ul>
      )}
      {moving && (moreLabel || lessLabel) && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={linkButtonClass("outline")}>
            {open ? lessLabel || moreLabel : moreLabel || lessLabel}
            {open ? <ArrowUp /> : <ArrowDown />}
          </button>
        </div>
      )}
    </>
  );
}

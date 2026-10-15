"use client";

import { useLinkStatus } from "next/link";

/**
 * Titik kecil di ujung menu sidebar yang berdenyut sejak menu diklik sampai halaman berganti.
 * Selalu dirender dengan ukuran tetap dan hanya kelihatan saat menunggu, supaya menu tidak bergeser.
 */
export function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`ml-auto size-1.5 shrink-0 rounded-full bg-primary transition-opacity duration-200 group-data-[collapsible=icon]:hidden ${pending ? "animate-pulse opacity-100" : "opacity-0"}`}
    />
  );
}

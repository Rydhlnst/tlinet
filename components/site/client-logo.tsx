"use client";

import { useEffect, useRef, useState } from "react";

/** Dua huruf awal nama, tanpa bentuk badan usaha di depannya ("PT Maju Jaya" → "MJ"). */
const initials = (name: string) =>
  name
    .replace(/^(PT|CV|UD)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

/** Logo klien; tanpa logo (atau bila gambarnya gagal dimuat) tampil monogram dan nama klien agar tidak muncul ikon gambar rusak. */
export function ClientLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  // Gambar bisa gagal sebelum hidrasi selesai, saat onError belum terpasang.
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0) setFailed(true);
  }, []);

  if (!logoUrl || failed) {
    return (
      <>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-brand-ink" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="text-sm font-semibold whitespace-nowrap text-foreground/80">{name}</span>
      </>
    );
  }
  // Tanpa loading="lazy": salinan logo di luar layar harus sudah berukuran agar putaran marquee tidak meloncat.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} src={logoUrl} alt={name} decoding="async" onError={() => setFailed(true)} className="h-9 w-auto max-w-40 object-contain" />;
}

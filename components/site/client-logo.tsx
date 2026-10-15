"use client";

import { useEffect, useRef, useState } from "react";
import { optimizedImage } from "@/lib/cms-image";

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

/**
 * Isi kartu logo: logo lalu namanya.
 * Tanpa logo, atau bila gambarnya gagal dimuat, tampil monogram agar tidak muncul ikon gambar rusak.
 */
export function ClientLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [failed, setFailed] = useState(false);
  const optimized = logoUrl ? optimizedImage(logoUrl, 80) : null;
  const image = useRef<HTMLImageElement>(null);

  // Gambar bisa gagal sebelum hidrasi selesai, saat onError belum terpasang.
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <>
      {!logoUrl || failed ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand-ink" aria-hidden="true">
          {initials(name)}
        </span>
      ) : (
        <span className="flex h-10 w-20 shrink-0 items-center justify-center">
          {/* Kotak logo berukuran tetap, jadi memuatnya belakangan (lazy) tidak menggeser putaran marquee. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={image}
            src={optimized?.src ?? logoUrl}
            srcSet={optimized?.srcSet}
            sizes={optimized?.sizes}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="max-h-full max-w-full object-contain"
          />
        </span>
      )}
      <span className="max-w-56 truncate text-sm font-medium text-foreground/80">{name}</span>
    </>
  );
}

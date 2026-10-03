"use client";

import { useState } from "react";

/** Logo klien; bila gambarnya gagal dimuat, nama klien ditampilkan sebagai teks agar tidak muncul ikon gambar rusak. */
export function ClientLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) return <>{name}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logoUrl} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-7 w-auto object-contain" />;
}

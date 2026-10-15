"use client";

import { Download, FileText, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";
import { isPdfUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

const barButton =
  "inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-medium text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 [&_svg]:size-4";

/**
 * Gambar kecil bukti transfer yang membuka tampilan layar penuh dengan tombol unduh. Gambarnya diambil
 * lewat /api/bukti di situs sendiri, jadi melihat dan mengunduhnya tidak berpindah ke alamat penyimpanan.
 */
export function ProofViewer({
  entityKey,
  id,
  label,
  url = "",
  field = "proofUrl",
  name = "Bukti transfer",
  thumbClassName = "size-9 object-cover",
}: {
  entityKey: string;
  id: string;
  label: string;
  /** Alamat asli bukti, untuk mengenali PDF. */
  url?: string;
  /** Kolom berkasnya bila bukan `proofUrl`, mis. `transferProofUrl` atau `aosUrl`. */
  field?: string;
  /** Nama berkas di judul dan label tombol, mis. "Invoice pemasok" atau "AOS". */
  name?: string;
  thumbClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const src = `/api/bukti/${entityKey}/${id}${field === "proofUrl" ? "" : `?field=${field}`}`;
  const pdf = isPdfUrl(url);

  return (
    <>
      <button
        type="button"
        aria-label={`Lihat ${name} ${label}`}
        className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          // Baris tabel di sekitarnya bisa punya aksi klik sendiri.
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {pdf ? (
          <span className="flex h-9 items-center gap-1 rounded-md border bg-brand-soft px-2 text-[11px] font-bold text-brand-ink">
            <FileText className="size-4" />
            PDF
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" className={cn("rounded-md border", thumbClassName)} />
        )}
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          {/* Kejadian di dalam portal tetap merambat ke induk React-nya, jadi dihentikan di sini juga. */}
          <DialogPrimitive.Content aria-describedby={undefined} onClick={(event) => event.stopPropagation()} className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white outline-none">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
              <DialogPrimitive.Title className="min-w-0 truncate text-sm font-medium">{name} {label}</DialogPrimitive.Title>
              <div className="flex shrink-0 gap-2">
                <a href={`${src}${src.includes("?") ? "&" : "?"}download=1`} download className={barButton}>
                  <Download />
                  Unduh
                </a>
                <DialogPrimitive.Close className={barButton}>
                  <X />
                  Tutup
                </DialogPrimitive.Close>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-4 pt-0">
              {pdf ? (
                <iframe src={src} title={`${name} ${label}`} className="size-full rounded-lg bg-white" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={`${name} ${label}`} className="max-h-full max-w-full rounded-lg object-contain" />
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

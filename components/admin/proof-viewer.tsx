"use client";

import { Download, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

const barButton =
  "inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-medium text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 [&_svg]:size-4";

/**
 * Gambar kecil bukti transfer yang membuka tampilan layar penuh dengan tombol unduh. Gambarnya diambil
 * lewat /api/bukti di situs sendiri, jadi melihat dan mengunduhnya tidak berpindah ke alamat penyimpanan.
 */
export function ProofViewer({ entityKey, id, label }: { entityKey: string; id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const src = `/api/bukti/${entityKey}/${id}`;

  return (
    <>
      <button
        type="button"
        aria-label={`Lihat bukti transfer ${label}`}
        className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          // Baris tabel di sekitarnya bisa punya aksi klik sendiri.
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" className="size-9 rounded-md border object-cover" />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          {/* Kejadian di dalam portal tetap merambat ke induk React-nya, jadi dihentikan di sini juga. */}
          <DialogPrimitive.Content aria-describedby={undefined} onClick={(event) => event.stopPropagation()} className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white outline-none">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
              <DialogPrimitive.Title className="min-w-0 truncate text-sm font-medium">Bukti transfer {label}</DialogPrimitive.Title>
              <div className="flex shrink-0 gap-2">
                <a href={`${src}?download=1`} download className={barButton}>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Bukti transfer ${label}`} className="max-h-full max-w-full rounded-lg object-contain" />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

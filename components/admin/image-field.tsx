"use client";

import { ImagePlus, Images, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { listMediaAction, type MediaItem } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/** Sisi terpanjang gambar setelah diperkecil, dan ukuran berkas yang masih dikirim apa adanya. */
const maxImageSide = 1920;
const keepAsIsBytes = 1024 * 1024;

/**
 * Memperkecil gambar besar di peramban agar foto kamera lolos batas unggah 4 MB. PNG dan WebP dijadikan WebP
 * supaya latar transparan logo tidak hilang; lainnya dijadikan JPEG. Bila gagal, berkas asli yang dipakai.
 */
async function shrinkImage(file: File): Promise<File> {
  if (file.size <= keepAsIsBytes) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxImageSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = file.type === "image/png" || file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    // Peramban yang tidak bisa menulis format itu mengembalikan PNG; hasil yang tidak lebih kecil juga tidak dipakai.
    if (!blob || blob.type !== type || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.\w+$/, "")}.${type === "image/webp" ? "webp" : "jpg"}`, { type });
  } catch {
    return file;
  }
}

/** Mengunggah satu gambar ke /api/upload dan mengembalikan URL-nya. Gambar besar diperkecil lebih dulu. */
export async function uploadImage(original: File): Promise<string | null> {
  const body = new FormData();
  body.append("file", await shrinkImage(original));
  try {
    const response = await fetch("/api/upload", { method: "POST", body });
    // Penolakan dari server hosting (mis. 413 karena terlalu besar) tidak berbentuk JSON.
    const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok || !result?.url) {
      toast.error(result?.error ?? (response.status === 413 ? "Gambar terlalu besar untuk diunggah. Ukuran maksimal 4 MB." : `Unggahan gagal (kode ${response.status}).`));
      return null;
    }
    return result.url;
  } catch {
    toast.error("Unggahan gagal. Periksa koneksi Anda.");
    return null;
  }
}

export function ImageField({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState<MediaItem[] | null>(null);
  const [open, setOpen] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) onChange(url);
  }

  async function openLibrary() {
    setOpen(true);
    setLibrary(await listMediaAction());
  }

  return (
    <div className="flex gap-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://… atau unggah gambar" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
            {uploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
            Unggah
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void openLibrary()}>
            <Images />
            Pilih dari media
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 />
              Kosongkan
            </Button>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pilih dari media</DialogTitle>
            <DialogDescription>Gambar yang pernah diunggah ke dashboard.</DialogDescription>
          </DialogHeader>
          {library === null ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" role="status" aria-label="Memuat media">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                <Skeleton key={item} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : library.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Belum ada gambar. Unggah gambar terlebih dahulu.</p>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto p-0.5 sm:grid-cols-4">
              {library.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.filename}
                  onClick={() => {
                    onChange(item.url);
                    setOpen(false);
                  }}
                  className="aspect-square overflow-hidden rounded-lg border bg-muted outline-none hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.filename} loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

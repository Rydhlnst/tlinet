"use client";

import { FileText, ImagePlus, Images, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { listMediaAction, type MediaItem } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isPdfUrl } from "@/lib/format";

/** Jenis yang diterima server apa adanya; jenis gambar lain diubah dulu di peramban. */
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
/** Di bawah ukuran ini gambar dikirim tanpa diubah; di atasnya diperkecil sampai di bawah batas unggah. */
const keepAsIsBytes = 1024 * 1024;
const uploadLimitBytes = 3.5 * 1024 * 1024;
/** Sisi terpanjang dan mutu yang dicoba berurutan sampai hasilnya muat. */
const shrinkSteps: [side: number, quality: number][] = [
  [1920, 0.85],
  [1600, 0.75],
  [1280, 0.7],
  [1024, 0.6],
];

function render(bitmap: ImageBitmap, side: number, type: string, quality: number) {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Menyiapkan gambar untuk diunggah, berapa pun ukurannya: foto besar diperkecil bertahap sampai muat, dan
 * jenis yang tidak diterima server (GIF, BMP, dan sebagainya) diubah ke JPEG atau WebP. PNG, WebP, dan GIF
 * dijadikan WebP supaya latar transparan tidak hilang. Bila peramban tidak bisa membacanya, berkas asli dikirim
 * dan server yang menjelaskan penolakannya.
 */
async function prepareImage(file: File): Promise<File> {
  const accepted = acceptedTypes.includes(file.type);
  if (accepted && file.size <= keepAsIsBytes) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const wanted = ["image/png", "image/webp", "image/gif"].includes(file.type) ? "image/webp" : "image/jpeg";
    let best: Blob | null = null;
    for (const [side, quality] of shrinkSteps) {
      let blob = await render(bitmap, side, wanted, quality);
      // Peramban yang tidak bisa menulis WebP mengembalikan PNG; pakai JPEG sebagai gantinya.
      if (blob && blob.type !== wanted) blob = await render(bitmap, side, "image/jpeg", quality);
      if (blob) best = blob;
      if (blob && blob.size <= uploadLimitBytes) break;
    }
    bitmap.close();
    // Gambar yang sudah diterima server dan tidak jadi lebih kecil dikirim apa adanya.
    if (!best || (accepted && best.size >= file.size && file.size <= uploadLimitBytes)) return file;
    return new File([best], `${file.name.replace(/\.\w+$/, "")}.${best.type === "image/webp" ? "webp" : "jpg"}`, { type: best.type });
  } catch {
    return file;
  }
}

const pdfLimitBytes = 4 * 1024 * 1024;

/**
 * Mengunggah satu gambar ke /api/upload dan mengembalikan URL-nya. Gangguan sementara di server dicoba sekali lagi.
 * Dengan `allowPdf`, berkas PDF ikut diterima dan dikirim apa adanya (PDF tidak bisa diperkecil di peramban).
 */
export async function uploadImage(original: File, { allowPdf = false } = {}): Promise<string | null> {
  const pdf = allowPdf && original.type === "application/pdf";
  if (pdf && original.size > pdfLimitBytes) {
    toast.error("Ukuran PDF maksimal 4 MB.");
    return null;
  }
  const prepared = pdf ? original : await prepareImage(original);
  try {
    for (let attempt = 1; ; attempt++) {
      const body = new FormData();
      body.append("file", prepared);
      if (allowPdf) body.append("allowPdf", "1");
      const response = await fetch("/api/upload", { method: "POST", body });
      // Penolakan dari server hosting (mis. 413 karena terlalu besar) tidak berbentuk JSON.
      const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (response.ok && result?.url) return result.url;
      if (response.status >= 500 && attempt < 2) continue;
      toast.error(result?.error ?? (response.status === 413 ? "Gambar terlalu besar untuk diunggah." : `Unggahan gagal (kode ${response.status}).`));
      return null;
    }
  } catch {
    toast.error("Unggahan gagal. Periksa koneksi Anda.");
    return null;
  }
}

export function ImageField({ value, onChange, id, allowPdf = false }: { value: string; onChange: (value: string) => void; id?: string; allowPdf?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState<MediaItem[] | null>(null);
  const [open, setOpen] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file, { allowPdf });
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
        {value && isPdfUrl(value) ? (
          <span className="flex flex-col items-center gap-1 text-xs font-semibold text-brand-ink">
            <FileText className="size-6" />
            PDF
          </span>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={allowPdf ? "https://… atau unggah gambar/PDF" : "https://… atau unggah gambar"} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={allowPdf ? "image/*,application/pdf" : "image/*"}
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
              {library.filter((item) => allowPdf || !isPdfUrl(item.url)).map((item) => (
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
                  {isPdfUrl(item.url) ? (
                    <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-xs font-semibold text-brand-ink">
                      <FileText className="size-6" />
                      <span className="w-full truncate text-center font-normal text-muted-foreground">{item.filename}</span>
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.filename} loading="lazy" className="size-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

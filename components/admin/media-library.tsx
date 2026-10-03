"use client";

import { Copy, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMediaAction, type MediaItem } from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { uploadImage } from "./image-field";

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function MediaLibrary({ items, storageLabel }: { items: MediaItem[]; storageLabel: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<MediaItem | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of files) if (await uploadImage(file)) uploaded += 1;
    setUploading(false);
    if (uploaded) {
      toast.success(`${uploaded} gambar diunggah.`);
      router.refresh();
    }
  }

  function remove() {
    if (!removing) return;
    const id = removing.id;
    startTransition(async () => {
      const result = await deleteMediaAction(id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setRemoving(null);
    });
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url.startsWith("/") ? `${window.location.origin}${url}` : url);
    toast.success("URL gambar disalin.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gambar yang diunggah dari dashboard. Penyimpanan aktif: {storageLabel}. Format JPG, PNG, WebP, atau AVIF, maksimal 4 MB.
          </p>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            void onFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Button size="lg" disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
          Unggah gambar
        </Button>
      </div>

      {items.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <div className="aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.filename} loading="lazy" className="size-full object-cover" />
              </div>
              <div className="flex items-center gap-1 p-2 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.filename}</p>
                  <p className="text-[11px] text-muted-foreground">{formatSize(item.size)}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => void copy(item.url)} aria-label={`Salin URL ${item.filename}`}>
                  <Copy />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRemoving(item)}
                  aria-label={`Hapus ${item.filename}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed py-20 text-center text-sm text-muted-foreground">
          Belum ada gambar. Unggah gambar di sini atau langsung dari kolom gambar pada form konten.
        </div>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && !pending && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus gambar ini?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removing?.filename}” dihapus permanen. Konten yang masih memakai gambar ini akan menampilkan gambar rusak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              {pending && <LoaderCircle className="animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
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

/**
 * Panel konfirmasi sebelum menghapus apa pun di dashboard: "Apakah Anda yakin…?" dengan tombol Batal dan Ya, hapus.
 * Tombol hapus baru menjalankan `onConfirm`; menutup panel atau menekan Batal tidak mengubah apa pun.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  description,
  pending = false,
  confirmLabel = "Ya, hapus",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  /** Mis. "pesan ini" → "Apakah Anda yakin mau menghapus pesan ini?" */
  title: string;
  description?: ReactNode;
  pending?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 sm:mx-0 dark:bg-rose-500/20 dark:text-rose-300">
            <TriangleAlert className="size-6" />
          </span>
          <AlertDialogTitle>Apakah Anda yakin mau menghapus {title}?</AlertDialogTitle>
          <AlertDialogDescription>{description ?? "Data dipindahkan ke Tempat Sampah dan masih bisa dikembalikan selama 30 hari."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              // Panel tetap terbuka sampai penghapusan selesai; pemanggil yang menutupnya.
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

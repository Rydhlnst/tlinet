"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { deleteRecordAction, saveRecordAction } from "@/app/admin/actions";
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getEntityDef } from "@/lib/cms/entities";
import { FieldGrid, type DynamicOptions } from "./field-control";

export type Row = Record<string, unknown> & { id?: string };

/** Form samping untuk menambah atau mengubah satu baris; `value` null berarti tertutup. */
export function RecordSheet({
  entityKey,
  value,
  setValue,
  options,
  hiddenFields = [],
}: {
  entityKey: string;
  value: Row | null;
  setValue: Dispatch<SetStateAction<Row | null>>;
  options?: DynamicOptions;
  /** Field yang nilainya sudah ditentukan pemanggil (mis. pelanggan pada form pembayaran). */
  hiddenFields?: string[];
}) {
  const entity = getEntityDef(entityKey)!;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const onClose = () => setValue(null);

  function save() {
    if (!value) return;
    startTransition(async () => {
      const result = await saveRecordAction(entity.key, value);
      if (result.ok) {
        toast.success(result.message);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Sheet open={value !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{value?.id ? `Ubah ${entity.singular}` : `Tambah ${entity.singular}`}</SheetTitle>
          <SheetDescription>{entity.description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {value && (
            <FieldGrid
              fields={entity.fields.filter((field) => !hiddenFields.includes(field.name))}
              values={value}
              options={options}
              // Pembaruan fungsional: peta mengisi latitude dan longitude dalam dua panggilan berurutan.
              onChange={(name, next) => setValue((current) => (current ? { ...current, [name]: next } : current))}
            />
          )}
        </div>
        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" size="lg" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button size="lg" onClick={save} disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            Simpan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Konfirmasi hapus satu baris; `row` null berarti tertutup. */
export function DeleteRecordDialog({ entityKey, row, title, onClose }: { entityKey: string; row: Row | null; title: string; onClose: () => void }) {
  const entity = getEntityDef(entityKey)!;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!row?.id) return;
    const id = row.id;
    startTransition(async () => {
      const result = await deleteRecordAction(entity.key, id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      onClose();
    });
  }

  return (
    <AlertDialog open={row !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {entity.singular} ini?</AlertDialogTitle>
          <AlertDialogDescription>“{title}” akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
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
  );
}

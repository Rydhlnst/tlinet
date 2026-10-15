"use client";

import { LoaderCircle, Pencil } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getEntityDef, type EntityDef } from "@/lib/cms/entities";
import type { Field } from "@/lib/cms/fields";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { FieldGrid, type DynamicOptions } from "./field-control";
import { ProofViewer } from "./proof-viewer";

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

/** Nilai satu field untuk dibaca: tanggal, bulan, rupiah, dan pilihan ditampilkan seperti di tabel. */
function DetailValue({ entity, field, row, options }: { entity: EntityDef; field: Field; row: Row; options?: DynamicOptions }) {
  const value = row[field.name];
  const text = value == null ? "" : String(value).trim();
  if (!text) return <span className="font-normal text-muted-foreground">—</span>;
  const column = entity.columns.find((item) => item.key === field.name);

  switch (field.type) {
    case "date":
      return formatDate(text);
    case "month":
      return formatMonth(text);
    case "number":
      return column?.type === "currency" ? formatRupiah(Number(value) || 0) : text;
    case "select":
      return (field.options ?? options?.[field.optionsFrom ?? ""])?.find((option) => option.value === text)?.label ?? text;
    case "image":
      // Bukti transfer dibuka lewat penampil layar penuh; gambar lain cukup ditampilkan.
      return column?.type === "proof" && row.id ? (
        <ProofViewer entityKey={entity.key} id={row.id} url={text} label={formatMonth(String(row.period ?? ""))} thumbClassName="max-h-56 w-auto max-w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={text} alt="" className="max-h-56 w-auto max-w-full rounded-md border object-contain" />
      );
    case "switch":
      return value === true ? "Ya" : "Tidak";
    default:
      return <span className="whitespace-pre-line">{text}</span>;
  }
}

/** Dialog baca-saja berisi semua isian satu baris; `row` null berarti tertutup. */
export function RecordDetailDialog({
  entityKey,
  row,
  onClose,
  onEdit,
  options,
  hiddenFields = [],
}: {
  entityKey: string;
  row: Row | null;
  onClose: () => void;
  /** Bila diisi, dialog menampilkan tombol Ubah yang menyerahkan baris ini ke form. */
  onEdit?: (row: Row) => void;
  options?: DynamicOptions;
  hiddenFields?: string[];
}) {
  const entity = getEntityDef(entityKey)!;
  // Field daftar dan peta tidak punya bentuk baca sederhana; entitas riwayat tidak memakainya.
  const fields = entity.fields.filter((field) => !hiddenFields.includes(field.name) && !["map", "list", "strings"].includes(field.type));

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail {entity.singular}</DialogTitle>
          <DialogDescription>{entity.label}</DialogDescription>
        </DialogHeader>
        {row && (
          <dl className="grid max-h-[60vh] grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-3 overflow-y-auto text-sm">
            {fields.map((field) => (
              <div key={field.name} className="contents">
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 font-medium break-words">
                  <DetailValue entity={entity} field={field} row={row} options={options} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {onEdit && row && (
            <Button
              onClick={() => {
                onEdit(row);
                onClose();
              }}
            >
              <Pencil />
              Ubah
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Check, ExternalLink, LoaderCircle, Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEntityDef, type Column } from "@/lib/cms/entities";
import { formatDate, formatDateTime, whatsappUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FieldGrid, type DynamicOptions } from "./field-control";

type Row = Record<string, unknown> & { id?: string };

function Cell({ column, row, options }: { column: Column; row: Row; options: DynamicOptions }) {
  const value = row[column.key];
  const text = value == null ? "" : String(value);

  switch (column.type) {
    case "boolean":
      return value ? <Check className="size-4 text-brand-ink" aria-label="Ya" /> : <Minus className="size-4 text-muted-foreground/50" aria-label="Tidak" />;
    case "image":
      return text ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={text} alt="" className="size-9 rounded-md border object-cover" />
      ) : (
        <span className="block size-9 rounded-md border border-dashed bg-muted/50" />
      );
    case "date":
      return <span className="whitespace-nowrap text-muted-foreground">{text ? formatDate(text) : "—"}</span>;
    case "datetime":
      return <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(value as Date)}</span>;
    case "whatsapp":
      return (
        <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-ink underline-offset-4 hover:underline">
          +{text}
        </a>
      );
    case "badge": {
      const label = column.labels?.[text] ?? options[column.labelsFrom ?? ""]?.find((option) => option.value === text)?.label ?? text;
      if (!label) return <span className="text-muted-foreground">—</span>;
      const strong = ["published", "new", "active"].includes(text);
      return <Badge variant={strong ? "default" : "secondary"}>{label}</Badge>;
    }
    default:
      return <span className={cn("block", column.className)}>{text || "—"}</span>;
  }
}

/** Tabel + form samping untuk satu koleksi, dibentuk dari definisi di lib/cms/entities.ts. */
export function ResourceManager({ entityKey, rows, options = {} }: { entityKey: string; rows: Row[]; options?: DynamicOptions }) {
  const entity = getEntityDef(entityKey)!;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [pending, startTransition] = useTransition();
  const canCreate = entity.canCreate !== false;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => entity.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)));
  }, [entity.searchKeys, query, rows]);

  function save() {
    if (!editing) return;
    startTransition(async () => {
      const result = await saveRecordAction(entity.key, editing);
      if (result.ok) {
        toast.success(result.message);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function remove() {
    if (!removing?.id) return;
    const id = removing.id;
    startTransition(async () => {
      const result = await deleteRecordAction(entity.key, id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setRemoving(null);
    });
  }

  const titleOf = (row: Row) => String(row[entity.columns.find((column) => !column.type || column.type === "text")?.key ?? "name"] ?? "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{entity.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{entity.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {entity.publicPath && (
            <Button asChild variant="outline" size="lg">
              <Link href={entity.publicPath} target="_blank">
                <ExternalLink />
                Lihat di situs
              </Link>
            </Button>
          )}
          {canCreate && (
            <Button size="lg" onClick={() => setEditing({ ...entity.defaults })}>
              <Plus />
              Tambah {entity.singular}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari ${entity.singular}…`} className="pl-8" />
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            {visible.length} dari {rows.length} data
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {entity.columns.map((column) => (
                <TableHead key={column.key} className={cn("first:pl-4", column.type === "image" && "w-16")}>
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="w-24 pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setEditing({ ...row })}>
                {entity.columns.map((column, index) => (
                  <TableCell key={column.key} className={cn("first:pl-4", index === 0 && column.type !== "image" && "font-medium")} onClick={column.type === "whatsapp" ? (event) => event.stopPropagation() : undefined}>
                    <Cell column={column} row={row} options={options} />
                  </TableCell>
                ))}
                <TableCell className="pr-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ ...row })} aria-label={`Ubah ${titleOf(row)}`}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoving(row)}
                    aria-label={`Hapus ${titleOf(row)}`}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={entity.columns.length + 1} className="h-32 text-center text-muted-foreground">
                  {rows.length ? "Tidak ada data yang cocok dengan pencarian." : `Belum ada ${entity.singular}.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && !pending && setEditing(null)}>
        <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>{editing?.id ? `Ubah ${entity.singular}` : `Tambah ${entity.singular}`}</SheetTitle>
            <SheetDescription>{entity.description}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {editing && (
              <FieldGrid
                fields={entity.fields}
                values={editing}
                options={options}
                onChange={(name, value) => setEditing((current) => (current ? { ...current, [name]: value } : current))}
              />
            )}
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="outline" size="lg" onClick={() => setEditing(null)} disabled={pending}>
              Batal
            </Button>
            <Button size="lg" onClick={save} disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              Simpan
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && !pending && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {entity.singular} ini?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removing ? titleOf(removing) : ""}” akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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

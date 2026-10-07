"use client";

import { Check, ExternalLink, Eye, Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEntityDef, type Column } from "@/lib/cms/entities";
import { formatDate, formatDateTime, formatMonth, formatRupiah, whatsappUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DynamicOptions } from "./field-control";
import { DeleteRecordDialog, RecordSheet, type Row } from "./record-dialogs";

function Cell({ column, row, options }: { column: Column; row: Row; options: DynamicOptions }) {
  const value = row[column.key];
  const text = value == null ? "" : String(value);
  const label = column.labels?.[text] ?? options[column.labelsFrom ?? ""]?.find((option) => option.value === text)?.label ?? text;

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
    case "month":
      return <span className="whitespace-nowrap">{text ? formatMonth(text) : "—"}</span>;
    case "currency":
      return <span className="whitespace-nowrap tabular-nums">{formatRupiah(Number(value) || 0)}</span>;
    case "whatsapp":
      return (
        <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-ink underline-offset-4 hover:underline">
          +{text}
        </a>
      );
    case "badge": {
      if (!label) return <span className="text-muted-foreground">—</span>;
      const strong = ["published", "new", "active", "paid"].includes(text);
      return <Badge variant={strong ? "default" : text === "suspended" ? "destructive" : text === "relocation" ? "outline" : "secondary"}>{label}</Badge>;
    }
    default:
      return <span className={cn("block", column.className)}>{label || "—"}</span>;
  }
}

/** Tabel + form samping untuk satu koleksi, dibentuk dari definisi di lib/cms/entities.ts. */
export function ResourceManager({ entityKey, rows, options = {} }: { entityKey: string; rows: Row[]; options?: DynamicOptions }) {
  const entity = getEntityDef(entityKey)!;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const canCreate = entity.canCreate !== false;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => entity.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)));
  }, [entity.searchKeys, query, rows]);

  // Judul baris untuk dialog dan label tombol: kolom nama bila ada, kalau tidak kolom teks pertama.
  const titleColumn = entity.columns.find((column) => column.key === "name") ?? entity.columns.find((column) => !column.type || column.type === "text");
  const titleOf = (row: Row) => {
    const text = String(row[titleColumn?.key ?? "name"] ?? "");
    return options[titleColumn?.labelsFrom ?? ""]?.find((option) => option.value === text)?.label ?? text;
  };
  const detailHref = (row: Row) => `${entity.detailPath}/${row.id}`;
  // Koleksi berhalaman detail membuka detailnya saat baris diklik; yang lain langsung membuka form ubah.
  const openRow = (row: Row) => (entity.detailPath ? router.push(detailHref(row)) : setEditing({ ...row }));

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
              <TableHead className={cn("pr-4 text-right", entity.detailPath ? "w-32" : "w-24")}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => openRow(row)}>
                {entity.columns.map((column, index) => (
                  <TableCell key={column.key} className={cn("first:pl-4", index === 0 && column.type !== "image" && "font-medium")} onClick={column.type === "whatsapp" ? (event) => event.stopPropagation() : undefined}>
                    <Cell column={column} row={row} options={options} />
                  </TableCell>
                ))}
                <TableCell className="pr-3 text-right whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                  {entity.detailPath && (
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Lihat detail ${titleOf(row)}`}>
                      <Link href={detailHref(row)}>
                        <Eye />
                      </Link>
                    </Button>
                  )}
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

      <RecordSheet entityKey={entity.key} value={editing} setValue={setEditing} options={options} />
      <DeleteRecordDialog entityKey={entity.key} row={removing} title={removing ? titleOf(removing) : ""} onClose={() => setRemoving(null)} />
    </div>
  );
}

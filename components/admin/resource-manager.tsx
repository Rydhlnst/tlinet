"use client";

import { Check, Ellipsis, ExternalLink, Eye, Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEntityDef, type Column } from "@/lib/cms/entities";
import { formatDate, formatDateTime, formatMonth, formatRupiah, whatsappUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AmountSummary } from "./amount-summary";
import type { DynamicOptions } from "./field-control";
import { MonthlyGenerate } from "./monthly-generate";
import { ProofViewer } from "./proof-viewer";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { DeleteRecordDialog, RecordDetailDialog, RecordSheet, type Row } from "./record-dialogs";

function Cell({ column, row, options, entityKey }: { column: Column; row: Row; options: DynamicOptions; entityKey: string }) {
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
    case "proof":
      return text && row.id ? <ProofViewer entityKey={entityKey} id={row.id} url={text} field={column.key} name={column.proofName} label={formatMonth(String(row.period ?? ""))} /> : <span className="text-muted-foreground">—</span>;
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
export function ResourceManager({ entityKey, rows, options = {}, hiddenFields = [] }: { entityKey: string; rows: Row[]; options?: DynamicOptions; hiddenFields?: string[] }) {
  const entity = getEntityDef(entityKey)!;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const canCreate = entity.canCreate !== false;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    // Kolom yang isinya id (mis. pelanggan) dicari lewat label yang tampil di tabel.
    const labelled = entity.columns.filter((column) => column.labelsFrom);
    const labelOf = (row: Row, column: Column) => options[column.labelsFrom!]?.find((option) => option.value === row[column.key])?.label ?? "";
    return rows.filter(
      (row) =>
        entity.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)) || labelled.some((column) => labelOf(row, column).toLowerCase().includes(term)),
    );
  }, [entity.columns, entity.searchKeys, options, query, rows]);

  // Judul baris untuk dialog dan label tombol: kolom nama bila ada, kalau tidak kolom teks pertama.
  const titleColumn = entity.columns.find((column) => column.key === "name") ?? entity.columns.find((column) => !column.type || column.type === "text");
  const titleOf = (row: Row) => {
    const text = String(row[titleColumn?.key ?? "name"] ?? "");
    return options[titleColumn?.labelsFrom ?? ""]?.find((option) => option.value === text)?.label ?? text;
  };
  const detailHref = (row: Row) => `${entity.detailPath}/${row.id}`;
  // Baris jumlah di bawah kolom nominal, untuk koleksi yang punya rangkuman.
  const amountKey = entity.summary?.amountKey;
  const amountTotal = amountKey ? visible.reduce((total, row) => total + (Number(row[amountKey]) || 0), 0) : 0;
  // Koleksi berhalaman detail membuka detailnya saat baris diklik; yang lain langsung membuka form ubah.
  const openRow = (row: Row) => (entity.detailPath ? router.push(detailHref(row)) : setEditing({ ...row }));
  // Tautan kirim lewat WhatsApp per baris (saat ini untuk invoice), disusun di server.
  const whatsappLinks = options.whatsappLinks;
  const whatsappOf = (row: Row) => whatsappLinks?.find((link) => link.value === row.id)?.label;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{entity.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{entity.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {entity.monthly && <MonthlyGenerate entityKey={entity.key} monthly={entity.monthly} rows={rows} />}
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

      {entity.summary && <AmountSummary summary={entity.summary} rows={visible} />}

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
                <TableHead key={column.key} className={cn("first:pl-4", (column.type === "image" || column.type === "proof") && "w-16")}>
                  {column.label}
                </TableHead>
              ))}
              <TableHead className={cn("pr-4 text-right", whatsappLinks ? "w-40" : entity.detailPath || entity.detailDialog ? "w-32" : "w-24")}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => openRow(row)}>
                {entity.columns.map((column, index) => (
                  <TableCell key={column.key} className={cn("first:pl-4", index === 0 && column.type !== "image" && "font-medium")} onClick={column.type === "whatsapp" ? (event) => event.stopPropagation() : undefined}>
                    <Cell column={column} row={row} options={options} entityKey={entity.key} />
                  </TableCell>
                ))}
                <TableCell className="pr-3 text-right whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                  {whatsappOf(row) && (
                    <Button asChild variant="ghost" size="icon-sm" className="text-[#1fa855] hover:text-[#1fa855]" title="Kirim lewat WhatsApp">
                      <a href={whatsappOf(row)} target="_blank" rel="noopener noreferrer" aria-label={`Kirim ${titleOf(row)} lewat WhatsApp`}>
                        <WhatsAppIcon />
                      </a>
                    </Button>
                  )}
                  {entity.detailPath && (
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Lihat detail ${titleOf(row)}`}>
                      <Link href={detailHref(row)}>
                        <Eye />
                      </Link>
                    </Button>
                  )}
                  {entity.detailDialog && (
                    <Button variant="ghost" size="icon-sm" onClick={() => setViewing(row)} aria-label={`Lihat detail ${titleOf(row)}`}>
                      <Ellipsis />
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
          {amountKey && visible.length > 0 && (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                {entity.columns.map((column, index) => (
                  <TableCell key={column.key} className={cn("first:pl-4", column.key === amountKey && "font-semibold whitespace-nowrap tabular-nums")}>
                    {column.key === amountKey ? formatRupiah(amountTotal) : index === 0 ? <span className="font-semibold">Jumlah ({visible.length})</span> : null}
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {entity.detailDialog && <RecordDetailDialog entityKey={entity.key} row={viewing} onClose={() => setViewing(null)} onEdit={(row) => setEditing({ ...row })} options={options} hiddenFields={hiddenFields} />}
      <RecordSheet entityKey={entity.key} value={editing} setValue={setEditing} options={options} hiddenFields={hiddenFields} />
      <DeleteRecordDialog entityKey={entity.key} row={removing} title={removing ? titleOf(removing) : ""} onClose={() => setRemoving(null)} />
    </div>
  );
}

"use client";

import {
  BadgeCheck,
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CirclePause,
  Clock,
  Gauge,
  Ellipsis,
  EllipsisVertical,
  ExternalLink,
  Eye,
  FileText,
  Handshake,
  IdCard,
  Inbox,
  Layers,
  MapPin,
  Minus,
  Newspaper,
  Package,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  ScrollText,
  Search,
  ShoppingBag,
  Tags,
  Trash2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar as AvatarRoot, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEntityDef, type Column, type EntityDef } from "@/lib/cms/entities";
import { formatBitrate, formatDate, formatDateTime, formatMonth, formatRupiah, parseCapacityBps, whatsappUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AmountSummary } from "./amount-summary";
import type { DynamicOptions } from "./field-control";
import { MonthlyGenerate } from "./monthly-generate";
import { PageHero, StatCard, type StatTone } from "./page-hero";
import { PointsMap, type MapPoint } from "./points-map";
import { ProofViewer } from "./proof-viewer";
import { StatusToggle, statusToggleEntities } from "./status-toggle";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { DeleteRecordDialog, RecordDetailDialog, RecordSheet, type Row } from "./record-dialogs";

/** Ikon banner per koleksi. */
const entityIcons: Record<string, LucideIcon> = {
  customers: Users,
  invoices: ScrollText,
  "customer-payments": ReceiptText,
  "customer-purchases": ShoppingBag,
  leads: Inbox,
  packages: Package,
  "package-categories": Tags,
  "coverage-areas": MapPin,
  faqs: CircleHelp,
  articles: Newspaper,
  clients: Handshake,
  employees: IdCard,
  salaries: Banknote,
};

/** Warna pil status: hijau = beres, merah = perlu ditagih/bermasalah, kuning = menunggu, abu-abu = belum aktif. */
const goodStatus = ["active", "paid", "published", "done"];
const badStatus = ["unpaid", "suspended"];
const waitStatus = ["pending", "installing", "contacted", "relocation", "expansion"];
function pillClass(value: string) {
  if (goodStatus.includes(value)) return "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (badStatus.includes(value)) return "bg-rose-50 text-rose-600 ring-rose-600/15 dark:bg-rose-500/15 dark:text-rose-300";
  if (waitStatus.includes(value)) return "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/15 dark:text-amber-300";
  if (value === "new") return "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/15 dark:text-blue-300";
  return "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/10 dark:text-slate-300";
}
const dotClass = (value: string) =>
  goodStatus.includes(value) ? "bg-emerald-500" : badStatus.includes(value) ? "bg-rose-500" : waitStatus.includes(value) ? "bg-amber-500" : value === "new" ? "bg-blue-500" : "bg-slate-400";

const avatarColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
];

/** "PT. SATELIT MENJAYA ABADI" → "SM": awalan PT/CV dilewati, lalu huruf pertama dua kata pertama. */
function initials(text: string) {
  const words = text
    .replace(/^(pt|cv)\b\.?\s*/i, "")
    .split(/[\s.]+/)
    .filter((word) => /[a-z0-9]/i.test(word));
  return (words.slice(0, 2).map((word) => word.replace(/[^a-z0-9]/gi, "")[0] ?? "").join("") || text.slice(0, 2)).toUpperCase();
}
const avatarColor = (text: string) => avatarColors[[...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length];

/** Foto profil pelanggan; inisial berwarna bila belum ada foto atau fotonya gagal dimuat. */
function Avatar({ text, photo }: { text: string; photo?: string }) {
  if (!text) return null;
  return (
    <AvatarRoot className="size-7">
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className={cn("text-[10px] font-bold", avatarColor(text))}>{initials(text)}</AvatarFallback>
    </AvatarRoot>
  );
}

/** URL foto avatar sebuah sel: dari kolom baris (string atau daftar) atau dari pilihan id → URL. */
function avatarPhotoOf(column: Column, row: Row, options: DynamicOptions) {
  if (column.avatarPhotoFrom) return options[column.avatarPhotoFrom]?.find((option) => option.value === row[column.key])?.label;
  const value = column.avatarPhoto ? row[column.avatarPhoto] : undefined;
  return Array.isArray(value) ? (value[0] as string | undefined) : typeof value === "string" ? value : undefined;
}

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
      // Kolom status memakai pil berwarna dengan titik; badge lain (kategori, jenis) pil biru lembut.
      if (column.key === "status") {
        const pill = (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset", pillClass(text))}>
            <span className={cn("size-1.5 rounded-full", dotClass(text))} />
            {label}
          </span>
        );
        // Status pembayaran bisa diganti langsung dari daftar (invoice dan History Pembayaran saling mengikuti).
        return statusToggleEntities.includes(entityKey) && row.id ? (
          <StatusToggle entityKey={entityKey} id={row.id} status={text}>
            {pill}
          </StatusToggle>
        ) : (
          pill
        );
      }
      return <span className="inline-flex rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand-ink">{label}</span>;
    }
    default:
      if (column.avatar && label) {
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar text={label} photo={avatarPhotoOf(column, row, options)} />
            <span className={cn("truncate", column.className)}>{label}</span>
          </span>
        );
      }
      return <span className={cn("block", column.className)}>{label || "—"}</span>;
  }
}

type Filter = { key: string; label: string; options: { value: string; label: string }[]; valueOf: (row: Row) => string };

/** Saringan otomatis: kolom badge, kolom bulan (atau periode rangkuman), dan kolom yang ditandai `filter`. */
function buildFilters(entity: EntityDef, rows: Row[], options: DynamicOptions): Filter[] {
  const filters: Filter[] = [];
  const periodKey = entity.summary?.periodKey ?? entity.columns.find((column) => column.type === "month")?.key;
  if (periodKey) {
    const months = [...new Set(rows.map((row) => String(row[periodKey] ?? "").slice(0, 7)).filter(Boolean))].sort().reverse();
    if (months.length > 1) filters.push({ key: "__month", label: "Semua bulan", options: months.map((month) => ({ value: month, label: formatMonth(month) })), valueOf: (row) => String(row[periodKey] ?? "").slice(0, 7) });
  }
  for (const column of entity.columns) {
    if (column.type !== "badge" && !column.filter) continue;
    const labelOf = (value: string) => column.labels?.[value] ?? options[column.labelsFrom ?? ""]?.find((option) => option.value === value)?.label ?? value;
    const values = [...new Set(rows.map((row) => String(row[column.key] ?? "").trim()).filter(Boolean))];
    if (values.length < 2) continue;
    filters.push({
      key: column.key,
      label: `Semua ${column.label.toLowerCase()}`,
      options: values.map((value) => ({ value, label: labelOf(value) })).sort((a, b) => a.label.localeCompare(b.label, "id")),
      valueOf: (row) => String(row[column.key] ?? "").trim(),
    });
  }
  return filters;
}

const statusTones: Record<string, { tone: StatTone; icon: LucideIcon }> = {
  active: { tone: "green", icon: BadgeCheck },
  paid: { tone: "green", icon: BadgeCheck },
  published: { tone: "green", icon: BadgeCheck },
  done: { tone: "green", icon: BadgeCheck },
  inactive: { tone: "amber", icon: CirclePause },
  draft: { tone: "amber", icon: CirclePause },
  new: { tone: "purple", icon: Inbox },
};

/**
 * Kartu jumlah per status (mis. pelanggan aktif / belum aktif), untuk koleksi tanpa rangkuman nominal. Dengan
 * `totalKey`, kartu pertama berisi total nominal baris yang sedang tampil (mengikuti pencarian dan saringan).
 */
function StatusSummary({ entity, rows, visible, filtered }: { entity: EntityDef; rows: Row[]; visible: Row[]; filtered: boolean }) {
  const column = entity.columns.find((item) => item.key === "status" && item.type === "badge" && item.labels);
  if (!column?.labels) return null;
  const counts = Object.keys(column.labels)
    .map((value) => ({ value, label: column.labels![value], count: rows.filter((row) => row.status === value).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  if (!rows.length) return null;
  const totalKey = entity.totalKey;
  const bandwidthKey = entity.bandwidthKey;
  const sumOf = (list: Row[]) => list.reduce((sum, row) => sum + (Number(row[totalKey ?? ""]) || 0), 0);
  const activeOf = (list: Row[]) => list.filter((row) => row.status === "active");
  const total = totalKey ? (
    <StatCard
      tone="green"
      icon={Wallet}
      label={entity.totalLabel ?? "Total"}
      value={formatRupiah(sumOf(visible))}
      hint={
        filtered
          ? `${visible.length} ${entity.singular} sesuai saringan`
          : `${visible.length} ${entity.singular} · aktif ${formatRupiah(sumOf(activeOf(visible)))}`
      }
      progress={1}
    />
  ) : null;
  const bandwidth = bandwidthKey ? (
    <StatCard
      tone="cyan"
      icon={Gauge}
      label="Total bandwidth"
      value={formatBitrate(sumBandwidth(visible, bandwidthKey))}
      hint={filtered ? `${visible.length} ${entity.singular} sesuai saringan` : `aktif ${formatBitrate(sumBandwidth(activeOf(visible), bandwidthKey))}`}
      progress={1}
    />
  ) : null;
  const cards = (total ? 1 : 0) + (bandwidth ? 1 : 0) + 1 + counts.length;
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:gap-4",
        // Jumlah kartu ganjil: kartu pertama selebar dua kolom di layar kecil agar tidak ada lubang.
        cards % 2 === 1 && "[&>*:first-child]:col-span-2 xl:[&>*:first-child]:col-span-1",
        // Enam kartu: dua baris tiga kolom, karena satu baris enam membuat label dan nominalnya terpotong.
        cards >= 6 ? "md:grid-cols-3 md:[&>*:first-child]:col-span-1" : cards === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4",
      )}
    >
      {total}
      {bandwidth}
      <StatCard tone="blue" icon={Layers} label={`Total ${entity.singular}`} value={rows.length} hint="Semua data" progress={1} />
      {counts.map((item, index) => {
        const style = statusTones[item.value] ?? { tone: (["red", "orange", "purple"] as const)[index], icon: Clock };
        return (
          <StatCard
            key={item.value}
            tone={style.tone}
            icon={style.icon}
            label={`${entity.singular[0].toUpperCase()}${entity.singular.slice(1)} ${item.label.toLowerCase()}`}
            value={item.count}
            hint={`${((item.count / rows.length) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total`}
            progress={item.count / rows.length}
          />
        );
      })}
    </div>
  );
}

/** Jumlah kapasitas (bit per detik) dari kolom teks bebas seperti "100 Mbps". */
const sumBandwidth = (list: Row[], key: string) => list.reduce((sum, row) => sum + parseCapacityBps(String(row[key] ?? "")), 0);

/** Titik peta dari baris yang tampil; koordinat kosong atau (0, 0) dilewati. */
function mapPoints(entity: EntityDef, rows: Row[]): MapPoint[] {
  const map = entity.map;
  if (!map) return [];
  return rows.flatMap((row) => {
    const lat = Number(row[map.latKey]);
    const lng = Number(row[map.lngKey]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
    const title = map.titleKeys.map((key) => String(row[key] ?? "")).find(Boolean) ?? "";
    return [
      {
        id: String(row.id),
        lat,
        lng,
        title: title || entity.singular,
        detail: map.detailKeys
          .map((key) => String(row[key] ?? ""))
          .filter(Boolean)
          .join(" · "),
        href: entity.detailPath ? `${entity.detailPath}/${row.id}` : undefined,
        active: row.status === "active",
      },
    ];
  });
}

const pageSizes = [10, 25, 50, 100];

/** Tabel + form samping untuk satu koleksi, dibentuk dari definisi di lib/cms/entities.ts. */
export function ResourceManager({ entityKey, rows, options = {}, hiddenFields = [] }: { entityKey: string; rows: Row[]; options?: DynamicOptions; hiddenFields?: string[] }) {
  const entity = getEntityDef(entityKey)!;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const canCreate = entity.canCreate !== false;
  const filters = useMemo(() => buildFilters(entity, rows, options), [entity, rows, options]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    // Kolom yang isinya id (mis. pelanggan) dicari lewat label yang tampil di tabel.
    const labelled = entity.columns.filter((column) => column.labelsFrom);
    const labelOf = (row: Row, column: Column) => options[column.labelsFrom!]?.find((option) => option.value === row[column.key])?.label ?? "";
    return rows.filter(
      (row) =>
        filters.every((filter) => !selected[filter.key] || filter.valueOf(row) === selected[filter.key]) &&
        (!term || entity.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)) || labelled.some((column) => labelOf(row, column).toLowerCase().includes(term))),
    );
  }, [entity.columns, entity.searchKeys, filters, options, query, rows, selected]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);
  const filtered = Boolean(query || Object.values(selected).some(Boolean));

  // Judul baris untuk dialog dan label tombol: kolom nama bila ada, kalau tidak kolom teks pertama.
  const titleColumn = entity.columns.find((column) => column.key === "name") ?? entity.columns.find((column) => !column.type || column.type === "text");
  const titleOf = (row: Row) => {
    const text = String(row[titleColumn?.key ?? "name"] ?? "");
    return options[titleColumn?.labelsFrom ?? ""]?.find((option) => option.value === text)?.label ?? text;
  };
  const detailHref = (row: Row) => `${entity.detailPath}/${row.id}`;
  // Baris jumlah di bawah kolom nominal, untuk koleksi yang punya rangkuman.
  const amountKey = entity.summary?.amountKey ?? entity.totalKey;
  const amountTotal = amountKey ? visible.reduce((total, row) => total + (Number(row[amountKey]) || 0), 0) : 0;
  const bandwidthKey = entity.bandwidthKey;
  const bandwidthTotal = bandwidthKey ? sumBandwidth(visible, bandwidthKey) : 0;
  const points = useMemo(() => mapPoints(entity, visible), [entity, visible]);
  // Koleksi berhalaman detail membuka detailnya saat baris diklik; yang lain langsung membuka form ubah.
  const openRow = (row: Row) => (entity.detailPath ? router.push(detailHref(row)) : setEditing({ ...row }));
  // Tautan kirim lewat WhatsApp per baris (saat ini untuk invoice), disusun di server.
  const whatsappLinks = options.whatsappLinks;
  const whatsappOf = (row: Row) => whatsappLinks?.find((link) => link.value === row.id)?.label;
  const emptyText = rows.length ? "Tidak ada data yang cocok dengan pencarian atau saringan." : `Belum ada ${entity.singular}.`;

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((number) => number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={entity.label}
        description={entity.description}
        icon={entityIcons[entity.key] ?? FileText}
        actions={
          <>
            {entity.monthly && <MonthlyGenerate entityKey={entity.key} monthly={entity.monthly} rows={rows} className="rounded-full bg-card shadow-sm" />}
            {entity.publicPath && (
              <Button asChild variant="outline" size="lg" className="rounded-full bg-card">
                <Link href={entity.publicPath} target="_blank">
                  <ExternalLink />
                  Lihat di situs
                </Link>
              </Button>
            )}
            {canCreate && (
              <Button size="lg" className="rounded-full px-5 shadow-[0_8px_20px_-8px_rgba(37,99,235,0.8)]" onClick={() => setEditing({ ...entity.defaults })}>
                <Plus />
                Tambah {entity.singular}
              </Button>
            )}
          </>
        }
      />

      {entity.summary ? <AmountSummary summary={entity.summary} rows={visible} /> : <StatusSummary entity={entity} rows={rows} visible={visible} filtered={filtered} />}

      {entity.map && (
        <PointsMap
          title={entity.map.title}
          description={entity.map.description}
          points={points}
          total={visible.length}
          noun={entity.singular}
          activeLabel={entity.map.activeLabel}
          inactiveLabel={entity.map.inactiveLabel}
        />
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)]">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={`Cari ${entity.singular}…`}
              className="h-10 rounded-xl pl-9"
            />
          </div>
          {filters.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {filters.map((filter) => (
                <select
                  key={filter.key}
                  value={selected[filter.key] ?? ""}
                  onChange={(event) => {
                    setSelected((current) => ({ ...current, [filter.key]: event.target.value }));
                    setPage(1);
                  }}
                  aria-label={filter.label}
                  className="h-10 min-w-0 rounded-xl border bg-background px-3 text-sm sm:max-w-52"
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
          {filtered && (
            <Button
              variant="outline"
              className="h-10 rounded-xl lg:ml-auto"
              onClick={() => {
                setQuery("");
                setSelected({});
                setPage(1);
              }}
            >
              <RotateCcw />
              Reset
            </Button>
          )}
        </div>

        {/* HP: satu kartu per baris, tanpa tabel lebar yang harus digeser ke samping. */}
        <ul className="divide-y md:hidden">
          {pageRows.map((row) => {
            const image = entity.columns.find((column) => column.type === "image");
            const [first, ...rest] = entity.columns.filter((column) => column.type !== "image");
            const badges = rest.filter((column) => column.type === "badge");
            const details = rest.filter((column) => column.type !== "badge").slice(0, 4);
            return (
              <li key={row.id} className="flex items-start gap-3 px-4 py-3 active:bg-muted/60" onClick={() => openRow(row)}>
                {image && (
                  <div className="shrink-0">
                    <Cell column={image} row={row} options={options} entityKey={entity.key} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-sm font-semibold [&_*]:truncate">{first && <Cell column={first} row={row} options={options} entityKey={entity.key} />}</div>
                    {badges.length > 0 && (
                      <div className="flex shrink-0 gap-1">
                        {badges.map((column) => (
                          <Cell key={column.key} column={column} row={row} options={options} entityKey={entity.key} />
                        ))}
                      </div>
                    )}
                  </div>
                  {details.length > 0 && (
                    <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {details.map((column) => (
                        <div key={column.key} className="min-w-0" onClick={column.type === "whatsapp" || column.type === "proof" ? (event) => event.stopPropagation() : undefined}>
                          <dt className="text-muted-foreground">{column.label}</dt>
                          <dd className="truncate font-medium [&_*]:truncate">
                            <Cell column={column} row={row} options={options} entityKey={entity.key} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <div onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="-mr-2" aria-label={`Aksi untuk ${titleOf(row)}`}>
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {entity.detailPath && (
                        <DropdownMenuItem asChild>
                          <Link href={detailHref(row)}>
                            <Eye />
                            Lihat detail
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {entity.detailDialog && (
                        <DropdownMenuItem onSelect={() => setViewing(row)}>
                          <Ellipsis />
                          Lihat detail
                        </DropdownMenuItem>
                      )}
                      {whatsappOf(row) && (
                        <DropdownMenuItem asChild>
                          <a href={whatsappOf(row)} target="_blank" rel="noopener noreferrer">
                            <WhatsAppIcon className="text-[#1fa855]" />
                            Kirim WhatsApp
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setEditing({ ...row })}>
                        <Pencil />
                        Ubah
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(row)}>
                        <Trash2 />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
          {visible.length === 0 && <li className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyText}</li>}
          {amountKey && visible.length > 0 && (
            <li className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
              <span>Jumlah ({visible.length})</span>
              <span className="tabular-nums">{formatRupiah(amountTotal)}</span>
            </li>
          )}
        </ul>

        <Table className="max-md:hidden">
          <TableHeader className="bg-[#f3f6fc] dark:bg-white/5">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-5 text-xs font-semibold text-foreground/80">No</TableHead>
              {entity.columns.map((column) => (
                <TableHead key={column.key} className={cn("text-xs font-semibold text-foreground/80", (column.type === "image" || column.type === "proof") && "w-16")}>
                  {column.label}
                </TableHead>
              ))}
              <TableHead className={cn("pr-5 text-right text-xs font-semibold text-foreground/80", whatsappLinks ? "w-40" : entity.detailPath || entity.detailDialog ? "w-32" : "w-24")}>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, rowIndex) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => openRow(row)}>
                <TableCell className="pl-5 text-muted-foreground tabular-nums">{start + rowIndex + 1}</TableCell>
                {entity.columns.map((column, index) => (
                  <TableCell key={column.key} className={cn("py-3", index === 0 && column.type !== "image" && "font-medium")} onClick={column.type === "whatsapp" ? (event) => event.stopPropagation() : undefined}>
                    <Cell column={column} row={row} options={options} entityKey={entity.key} />
                  </TableCell>
                ))}
                <TableCell className="pr-4 text-right whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                  {whatsappOf(row) && (
                    <Button asChild variant="ghost" size="icon-sm" className="text-[#1fa855] hover:bg-emerald-50 hover:text-[#1fa855] dark:hover:bg-emerald-500/10" title="Kirim lewat WhatsApp">
                      <a href={whatsappOf(row)} target="_blank" rel="noopener noreferrer" aria-label={`Kirim ${titleOf(row)} lewat WhatsApp`}>
                        <WhatsAppIcon />
                      </a>
                    </Button>
                  )}
                  {entity.detailPath && (
                    <Button asChild variant="ghost" size="icon-sm" className="text-brand-ink hover:bg-brand-soft hover:text-brand-ink" aria-label={`Lihat detail ${titleOf(row)}`}>
                      <Link href={detailHref(row)}>
                        <Eye />
                      </Link>
                    </Button>
                  )}
                  {entity.detailDialog && (
                    <Button variant="ghost" size="icon-sm" className="text-brand-ink hover:bg-brand-soft hover:text-brand-ink" onClick={() => setViewing(row)} aria-label={`Lihat detail ${titleOf(row)}`}>
                      <Ellipsis />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-muted" onClick={() => setEditing({ ...row })} aria-label={`Ubah ${titleOf(row)}`}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
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
                <TableCell colSpan={entity.columns.length + 2} className="h-32 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {(amountKey || bandwidthKey) && visible.length > 0 && (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell />
                {entity.columns.map((column, index) => (
                  <TableCell key={column.key} className={cn((column.key === amountKey || column.key === bandwidthKey) && "font-semibold whitespace-nowrap tabular-nums")}>
                    {column.key === amountKey ? (
                      formatRupiah(amountTotal)
                    ) : column.key === bandwidthKey ? (
                      formatBitrate(bandwidthTotal)
                    ) : index === 0 ? (
                      <span className="font-semibold">Jumlah ({visible.length})</span>
                    ) : null}
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>

        {visible.length > 0 && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between md:px-5">
            <p className="text-muted-foreground">
              Menampilkan {start + 1} – {Math.min(start + pageSize, visible.length)} dari {visible.length} data
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon-sm" className="rounded-lg" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Halaman sebelumnya">
                <ChevronLeft />
              </Button>
              {pages.map((number, index) => (
                <span key={number} className="flex items-center gap-1.5">
                  {index > 0 && number - pages[index - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
                  <Button
                    variant={number === currentPage ? "default" : "outline"}
                    size="icon-sm"
                    className="rounded-lg tabular-nums"
                    onClick={() => setPage(number)}
                    aria-current={number === currentPage ? "page" : undefined}
                  >
                    {number}
                  </Button>
                </span>
              ))}
              <Button variant="outline" size="icon-sm" className="rounded-lg" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Halaman berikutnya">
                <ChevronRight />
              </Button>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Jumlah baris per halaman"
                className="ml-2 h-8 rounded-lg border bg-background px-2 text-sm"
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size} / halaman
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {entity.detailDialog && <RecordDetailDialog entityKey={entity.key} row={viewing} onClose={() => setViewing(null)} onEdit={(row) => setEditing({ ...row })} options={options} hiddenFields={hiddenFields} />}
      <RecordSheet entityKey={entity.key} value={editing} setValue={setEditing} options={options} hiddenFields={hiddenFields} />
      <DeleteRecordDialog entityKey={entity.key} row={removing} title={removing ? titleOf(removing) : ""} onClose={() => setRemoving(null)} />
    </div>
  );
}

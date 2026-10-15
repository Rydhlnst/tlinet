"use client";

import { ArrowLeft, Calculator, ChevronRight, Ellipsis, ImagePlus, Images, LoaderCircle, MapPin, Pencil, Plus, ReceiptText, ShoppingBag, StickyNote, Trash2, User, Wifi, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { saveCustomerPhotosAction } from "@/app/admin/actions";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AccurateLedger } from "@/lib/accurate";
import { customerStatusLabels, getEntityDef, paymentStatusLabels } from "@/lib/cms/entities";
import type { customerPayments, customerPurchases, customers } from "@/lib/db/schema";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AmountSummary } from "./amount-summary";
import { uploadImage } from "./image-field";
import { ProofViewer } from "./proof-viewer";
import { DeleteRecordDialog, RecordDetailDialog, RecordSheet, type Row } from "./record-dialogs";

type Customer = typeof customers.$inferSelect;
/** Baris History Pembayaran Subnet; baris History Pembelian Perusahaan menambah pemasok dan layanannya. */
// Kolom bersama pembayaran dan pembelian; PIC hanya ada di pembayaran.
type HistoryRow = Omit<typeof customerPayments.$inferSelect, "pic">;
type PurchaseRow = typeof customerPurchases.$inferSelect;
/** Data Accurate pelanggan ini: null bila tidak tertaut, `error` bila Accurate gagal dijangkau. */
export type LedgerState = AccurateLedger | { error: string } | null;

const listPath = "/admin/data/customers";

/** Dua huruf awal nama ("Ahmad Rahman" → "AR"). */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

/** Tanggal hari ini menurut jam perangkat, "YYYY-MM-DD". */
function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const pillTones = {
  good: ["bg-emerald-50 text-emerald-700", "bg-emerald-500"],
  warn: ["bg-amber-50 text-amber-700", "bg-amber-500"],
  bad: ["bg-red-50 text-red-700", "bg-red-500"],
  muted: ["bg-muted text-muted-foreground", "bg-muted-foreground/60"],
};

const customerTones: Record<string, keyof typeof pillTones> = { active: "good", inactive: "muted", suspended: "bad", relocation: "warn" };

function StatusPill({ tone, children }: { tone: keyof typeof pillTones; children: ReactNode }) {
  const [surface, dot] = pillTones[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", surface)}>
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {children}
    </span>
  );
}

function Panel({ icon: Icon, title, action, children, className }: { icon: LucideIcon; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="flex items-center gap-2.5 text-base font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
            <Icon className="size-4" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-3 p-5 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value || <span className="font-normal text-muted-foreground">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Panel riwayat bulanan (pembayaran atau pembelian) beserta form tambah/ubah dan konfirmasi hapusnya. */
function HistoryPanel({
  entityKey,
  icon,
  title,
  noun,
  rows,
  customerId,
  defaults,
}: {
  entityKey: string;
  icon: LucideIcon;
  title: string;
  /** Kata benda untuk tombol dan label, mis. "Pembayaran". */
  noun: string;
  /** Baris pembelian membawa pemasok dan layanan; bila ada, keduanya ditampilkan sebagai kolom. */
  rows: (HistoryRow & Partial<Pick<PurchaseRow, "supplierName" | "serviceName" | "cid" | "paymentNumber">>)[];
  customerId: string;
  /** Isian awal form tambah selain bulan, tanggal, dan status, mis. nominal dari biaya bulanan pelanggan. */
  defaults: Row;
}) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const lower = noun.toLowerCase();
  const withSupplier = entityKey === "customer-purchases";
  const summary = getEntityDef(entityKey)?.summary;

  return (
    <>
      <Panel
        icon={icon}
        title={title}
        action={
          <Button
            variant="outline"
            onClick={() => setEditing({ customerId, period: today().slice(0, 7), paidDate: today(), method: rows[0]?.method ?? "", status: "paid", ...defaults })}
          >
            <Plus />
            Tambah {noun}
          </Button>
        }
      >
        {summary && rows.length > 0 && <AmountSummary summary={summary} rows={rows} variant="strip" />}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-5">No</TableHead>
              {withSupplier && <TableHead>Pemasok</TableHead>}
              {withSupplier && <TableHead>Layanan</TableHead>}
              {withSupplier && <TableHead>CID</TableHead>}
              <TableHead>Bulan</TableHead>
              <TableHead>Tanggal Bayar</TableHead>
              <TableHead>Nominal</TableHead>
              <TableHead>{withSupplier ? "No. Pembayaran" : "Metode"}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead className="w-32 pr-5 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="pl-5 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                {withSupplier && <TableCell className="font-medium">{item.supplierName || "—"}</TableCell>}
                {withSupplier && <TableCell>{item.serviceName || "—"}</TableCell>}
                {withSupplier && <TableCell className="whitespace-nowrap">{item.cid || "—"}</TableCell>}
                <TableCell className="font-medium whitespace-nowrap">
                  {formatMonth(item.period)}
                  {item.note && <span className="block max-w-56 truncate text-xs font-normal text-muted-foreground">{item.note}</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{item.paidDate ? formatDate(item.paidDate) : "—"}</TableCell>
                <TableCell className="font-medium whitespace-nowrap tabular-nums">{formatRupiah(item.amount)}</TableCell>
                <TableCell className="tabular-nums">{(withSupplier ? item.paymentNumber : item.method) || "—"}</TableCell>
                <TableCell>
                  <StatusPill tone={item.status === "paid" ? "good" : "warn"}>{paymentStatusLabels[item.status] ?? item.status}</StatusPill>
                </TableCell>
                <TableCell>
                  {item.proofUrl ? <ProofViewer entityKey={entityKey} id={item.id} label={formatMonth(item.period)} /> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="pr-4 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon-sm" onClick={() => setViewing(item)} aria-label={`Lihat detail ${lower} ${formatMonth(item.period)}`}>
                    <Ellipsis />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ ...item })} aria-label={`Ubah ${lower} ${formatMonth(item.period)}`}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoving(item)}
                    aria-label={`Hapus ${lower} ${formatMonth(item.period)}`}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={withSupplier ? 11 : 8} className="h-28 text-center text-muted-foreground">
                  Belum ada {lower} yang dicatat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <RecordDetailDialog entityKey={entityKey} row={viewing} onClose={() => setViewing(null)} onEdit={(row) => setEditing({ ...row })} hiddenFields={["customerId"]} />
      <RecordSheet entityKey={entityKey} value={editing} setValue={setEditing} hiddenFields={["customerId"]} />
      <DeleteRecordDialog entityKey={entityKey} row={removing} title={removing ? `${noun} ${formatMonth(String(removing.period))}` : ""} onClose={() => setRemoving(null)} />
    </>
  );
}

/** Halaman detail satu pelanggan: profil, layanan, foto, riwayat pembayaran, dan riwayat pembelian. */
export function CustomerDetail({ customer, payments, purchases, ledger }: { customer: Customer; payments: HistoryRow[]; purchases: PurchaseRow[]; ledger: LedgerState }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingPhotos, startSavingPhotos] = useTransition();

  // Kecamatan, kabupaten, dan provinsi melengkapi alamat jalan di panel alamat.
  const wilayah = [customer.district && `Kec. ${customer.district}`, customer.regency, customer.province].filter(Boolean).join(", ");

  const statusPill = (
    <StatusPill tone={customerTones[customer.status] ?? "muted"}>{customerStatusLabels[customer.status] ?? customer.status}</StatusPill>
  );

  async function savePhotos(photos: string[]) {
    const result = await saveCustomerPhotosAction(customer.id, photos);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  async function addPhotos(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }
    if (urls.length) await savePhotos([...customer.photos, ...urls]);
    setUploading(false);
  }

  function removePhoto() {
    if (!removingPhoto) return;
    const url = removingPhoto;
    startSavingPhotos(async () => {
      await savePhotos(customer.photos.filter((photo) => photo !== url));
      setRemovingPhoto(null);
    });
  }

  return (
    <>
      <nav className="flex items-center gap-2 text-sm" aria-label="Jejak halaman">
        <Link href={listPath} className="font-medium text-brand-ink underline-offset-4 hover:underline">
          Data Pelanggan
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">Detail Pelanggan</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detail Pelanggan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Informasi lengkap data pelanggan, foto, dan riwayat pembayaran.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="lg">
            <Link href={listPath}>
              <ArrowLeft />
              Kembali ke Data Pelanggan
            </Link>
          </Button>
          <Button size="lg" onClick={() => setEditing({ ...customer })}>
            <Pencil />
            Edit Data
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-2xl font-semibold text-brand-ink">
            {customer.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={customer.photos[0]} alt={`Foto ${customer.name}`} className="size-full object-cover" />
            ) : (
              initials(customer.name)
            )}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <p className="max-w-full truncate text-xl font-semibold">{customer.name}</p>
            {customer.company && <p className="max-w-full truncate text-sm text-muted-foreground">{customer.company}</p>}
            {statusPill}
            {customer.activationDate && <p className="text-sm text-muted-foreground">Pelanggan sejak {formatDate(customer.activationDate)}</p>}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm lg:shrink-0">
          {[
            ["Site ID", customer.siteId],
            ["CID", customer.cid],
            ["Kapasitas", customer.capacity],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold break-words">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel icon={User} title="Informasi Pribadi">
          <InfoList
            items={[
              ["Nama", customer.name],
              ["PT", customer.company],
              ["No. Telepon", customer.phone],
              ["Site ID", customer.siteId],
              ["CID", customer.cid],
              ...(customer.accurateNo ? ([["No. Accurate", customer.accurateNo]] as [string, string][]) : []),
              ["Kecamatan", customer.district],
              ["Kabupaten", customer.regency],
              ["Provinsi", customer.province],
            ]}
          />
        </Panel>
        <Panel icon={Wifi} title="Informasi Layanan">
          <InfoList
            items={[
              ["Kapasitas", customer.capacity],
              ["Biaya Bulanan ke ISP", customer.monthlyFee ? formatRupiah(customer.monthlyFee) : ""],
              ["Biaya Bulanan ke NAP", customer.napFee ? formatRupiah(customer.napFee) : ""],
              ["Selisih Keuntungan", customer.monthlyFee || customer.napFee ? formatRupiah(customer.monthlyFee - customer.napFee) : ""],
              ["No. Pembayaran", customer.paymentNumber],
              ["Vendor", customer.vendor],
              ["IP Address", customer.ipAddress],
              ["Tanggal Aktivasi", customer.activationDate ? formatDate(customer.activationDate) : ""],
              ["Status Layanan", statusPill],
            ]}
          />
        </Panel>
      </div>

      <Panel
        icon={MapPin}
        title="Alamat Lengkap"
        action={
          <Button variant="outline" onClick={() => setEditing({ ...customer })}>
            <Pencil />
            {customer.address ? "Ubah Alamat" : "Isi Alamat"}
          </Button>
        }
      >
        <div className="flex flex-col gap-1.5 p-5 text-sm leading-relaxed">
          {customer.address ? <p className="whitespace-pre-line">{customer.address}</p> : <p className="text-muted-foreground">Alamat lengkap belum diisi.</p>}
          {wilayah && <p className="text-muted-foreground">{wilayah}</p>}
        </div>
      </Panel>

      {customer.note && (
        <Panel icon={StickyNote} title="Keterangan">
          <p className="p-5 text-sm leading-relaxed whitespace-pre-line">{customer.note}</p>
        </Panel>
      )}

      <Panel
        icon={Images}
        title="Foto Pelanggan"
        action={
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                // Disalin dulu: mengosongkan input ikut mengosongkan daftar berkasnya.
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                void addPhotos(files);
              }}
            />
            <Button variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
              {uploading ? "Mengunggah…" : "Unggah Foto"}
            </Button>
          </>
        }
      >
        {customer.photos.length ? (
          <ul className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
            {customer.photos.map((photo, index) => (
              <li key={photo} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                <a href={photo} target="_blank" rel="noopener noreferrer" aria-label={`Buka foto ${index + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={`Foto ${index + 1} ${customer.name}`} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </a>
                {index === 0 && (
                  <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                    Foto profil
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setRemovingPhoto(photo)}
                  aria-label={`Hapus foto ${index + 1}`}
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-ink/75 text-white transition-opacity outline-none hover:bg-destructive focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Belum ada foto. Unggah foto pelanggan, lokasi, atau perangkat terpasang; foto pertama dipakai sebagai foto profil.
          </p>
        )}
      </Panel>

      {ledger && (
        <Panel icon={Calculator} title="Faktur & Pembayaran di Accurate">
          {"error" in ledger ? (
            <p className="p-5 text-sm leading-relaxed text-muted-foreground">Data Accurate tidak dapat dimuat: {ledger.error}</p>
          ) : (
            <>
              <p className="border-b px-5 py-3 text-sm text-muted-foreground">
                {ledger.invoices.length} faktur, {ledger.receipts.length} penerimaan. Sisa tagihan{" "}
                <span className="font-semibold text-foreground tabular-nums">{formatRupiah(ledger.invoices.reduce((sum, invoice) => sum + invoice.owing, 0))}</span>.
              </p>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">No. Faktur</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Sisa Tagihan</TableHead>
                    <TableHead className="pr-5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="pl-5 font-medium whitespace-nowrap">{invoice.number}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{invoice.date ? formatDate(invoice.date) : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatRupiah(invoice.total)}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatRupiah(invoice.owing)}</TableCell>
                      <TableCell className="pr-5">
                        <StatusPill tone={invoice.owing > 0 ? "warn" : "good"}>{invoice.status || (invoice.owing > 0 ? "Belum lunas" : "Lunas")}</StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ledger.invoices.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        Belum ada faktur penjualan di Accurate.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {ledger.receipts.length > 0 && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-5">No. Penerimaan</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="pr-5">Jumlah Diterima</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.receipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="pl-5 font-medium whitespace-nowrap">{receipt.number}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{receipt.date ? formatDate(receipt.date) : "—"}</TableCell>
                          <TableCell className="pr-5 whitespace-nowrap tabular-nums">{formatRupiah(receipt.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      <HistoryPanel
        entityKey="customer-payments"
        icon={ReceiptText}
        title="History Pembayaran Subnet"
        noun="Pembayaran"
        rows={payments}
        customerId={customer.id}
        defaults={{ amount: customer.monthlyFee || "" }}
      />

      <HistoryPanel
        entityKey="customer-purchases"
        icon={ShoppingBag}
        title="History Pembelian Perusahaan"
        noun="Pembelian"
        rows={purchases}
        customerId={customer.id}
        // Pemasok biasanya sama dari bulan ke bulan: ambil dari pembelian terakhir, kalau belum ada dari vendor pelanggan.
        defaults={{
          amount: customer.napFee || "",
          supplierName: purchases[0]?.supplierName || customer.vendor,
          supplierAddress: purchases[0]?.supplierAddress ?? "",
          supplierEmail: purchases[0]?.supplierEmail ?? "",
          serviceName: purchases[0]?.serviceName ?? "",
          cid: purchases[0]?.cid || customer.cid,
          siteId: customer.siteId,
          paymentNumber: purchases[0]?.paymentNumber || customer.paymentNumber,
        }}
      />

      <RecordSheet entityKey="customers" value={editing} setValue={setEditing} />

      <AlertDialog open={removingPhoto !== null} onOpenChange={(open) => !open && !savingPhotos && setRemovingPhoto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus foto ini?</AlertDialogTitle>
            <AlertDialogDescription>Foto dilepas dari pelanggan ini. Berkasnya tetap ada di menu Media sampai dihapus dari sana.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingPhotos}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={savingPhotos}
              onClick={(event) => {
                event.preventDefault();
                removePhoto();
              }}
            >
              {savingPhotos && <LoaderCircle className="animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

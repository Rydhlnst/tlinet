"use client";

import { ArrowLeft, Calculator, ChevronRight, Ellipsis, Eye, ImagePlus, Images, LoaderCircle, MapPin, Pencil, Plus, ReceiptText, ScrollText, ShoppingBag, StickyNote, Trash2, User, Wifi, X, type LucideIcon, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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
import { customerStatusLabels, getEntityDef, invoiceStatusLabels, paymentStatusLabels } from "@/lib/cms/entities";
import type { customerPayments, customerPurchases, customers, invoices as invoiceTable } from "@/lib/db/schema";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { AmountSummary } from "./amount-summary";
import { StatusToggle } from "./status-toggle";
import { customerTones, InfoList, Panel, StatusPill } from "./detail-panels";
import { EditableAvatar } from "./editable-avatar";
import { MonthlyGenerate } from "./monthly-generate";
import { uploadImage } from "./image-field";
import { ProofViewer } from "./proof-viewer";
import { PageHero } from "./page-hero";
import { DeleteRecordDialog, RecordDetailDialog, RecordSheet, type Row } from "./record-dialogs";

type Customer = typeof customers.$inferSelect;
/** Baris History Pembayaran Subnet; baris History Pembelian Perusahaan menambah pemasok dan layanannya. */
// Kolom bersama pembayaran dan pembelian; PIC dan invoice asal hanya ada di pembayaran.
type HistoryRow = Omit<typeof customerPayments.$inferSelect, "pic" | "invoiceId">;
type PurchaseRow = typeof customerPurchases.$inferSelect;
type InvoiceRow = typeof invoiceTable.$inferSelect;
/** Data Accurate pelanggan ini: null bila tidak tertaut, `error` bila Accurate gagal dijangkau. */
export type LedgerState = AccurateLedger | { error: string } | null;

const listPath = "/admin/data/customers";

/** Tanggal hari ini menurut jam perangkat, "YYYY-MM-DD". */
function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
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
  rows: (HistoryRow & Partial<Pick<PurchaseRow, "supplierName" | "serviceName" | "cid" | "paymentNumber" | "transferProofUrl">>)[];
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
  const monthly = getEntityDef(entityKey)?.monthly;

  return (
    <>
      <Panel
        icon={icon}
        title={title}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            {monthly && <MonthlyGenerate entityKey={entityKey} monthly={monthly} rows={rows} customerId={customerId} size="default" />}
            <Button
              variant="outline"
              onClick={() => setEditing({ customerId, period: today().slice(0, 7), paidDate: today(), method: rows[0]?.method ?? "", status: "paid", ...defaults })}
            >
              <Plus />
              Tambah {noun}
            </Button>
          </div>
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
              {withSupplier && <TableHead>Invoice</TableHead>}
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
                  <StatusToggle entityKey={entityKey} id={item.id} status={item.status}>
                    <StatusPill tone={item.status === "paid" ? "good" : "warn"}>{paymentStatusLabels[item.status] ?? item.status}</StatusPill>
                  </StatusToggle>
                </TableCell>
                {withSupplier && (
                  <TableCell>
                    {item.proofUrl ? (
                      <ProofViewer entityKey={entityKey} id={item.id} url={item.proofUrl} name="Invoice pemasok" label={formatMonth(item.period)} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  {(withSupplier ? item.transferProofUrl : item.proofUrl) ? (
                    <ProofViewer
                      entityKey={entityKey}
                      id={item.id}
                      url={(withSupplier ? item.transferProofUrl : item.proofUrl) ?? ""}
                      field={withSupplier ? "transferProofUrl" : "proofUrl"}
                      label={formatMonth(item.period)}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
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
                <TableCell colSpan={withSupplier ? 12 : 8} className="h-28 text-center text-muted-foreground">
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

/** Panel invoice milik pelanggan ini: buka untuk dicetak, ubah, hapus, atau buat invoice baru yang langsung tertaut. */
function InvoicePanel({ rows, customerId }: { rows: InvoiceRow[]; customerId: string }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const entity = getEntityDef("invoices");

  return (
    <>
      <Panel
        icon={ScrollText}
        title="Invoice"
        action={
          <div className="flex flex-wrap justify-end gap-2">
            {entity?.monthly && <MonthlyGenerate entityKey="invoices" monthly={entity.monthly} rows={rows} customerId={customerId} size="default" />}
            <Button variant="outline" onClick={() => setEditing({ ...entity?.defaults, customerId })}>
              <Plus />
              Buat invoice
            </Button>
          </div>
        }
      >
        {entity?.summary && rows.length > 0 && <AmountSummary summary={entity.summary} rows={rows} variant="strip" />}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">No. Invoice</TableHead>
              <TableHead>Tanggal terbit</TableHead>
              <TableHead>Jatuh tempo</TableHead>
              <TableHead>Total tagihan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 pr-5 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="pl-5 font-medium whitespace-nowrap">
                  <Link href={`/admin/invoice/${invoice.id}`} className="underline-offset-4 hover:text-brand-ink hover:underline">
                    {invoice.number}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(invoice.issueDate)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                <TableCell className="font-medium whitespace-nowrap tabular-nums">{formatRupiah(invoice.total)}</TableCell>
                <TableCell>
                  <StatusToggle entityKey="invoices" id={invoice.id} status={invoice.status}>
                    <StatusPill tone={invoice.status === "paid" ? "good" : "warn"}>{invoiceStatusLabels[invoice.status] ?? invoice.status}</StatusPill>
                  </StatusToggle>
                </TableCell>
                <TableCell className="pr-4 text-right whitespace-nowrap">
                  <Button asChild variant="ghost" size="icon-sm" aria-label={`Buka invoice ${invoice.number}`}>
                    <Link href={`/admin/invoice/${invoice.id}`}>
                      <Eye />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ ...invoice })} aria-label={`Ubah invoice ${invoice.number}`}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoving({ ...invoice })}
                    aria-label={`Hapus invoice ${invoice.number}`}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                  Belum ada invoice untuk pelanggan ini.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <RecordSheet entityKey="invoices" value={editing} setValue={setEditing} hiddenFields={["customerId"]} />
      <DeleteRecordDialog entityKey="invoices" row={removing} title={removing ? `invoice ${String(removing.number)}` : ""} onClose={() => setRemoving(null)} />
    </>
  );
}

/** Halaman detail satu pelanggan: profil, layanan, foto, invoice, riwayat pembayaran, dan riwayat pembelian. */
export function CustomerDetail({
  customer,
  invoices,
  payments,
  purchases,
  ledger,
  access = { billing: true, finance: true },
}: {
  customer: Customer;
  invoices: InvoiceRow[];
  payments: HistoryRow[];
  purchases: PurchaseRow[];
  ledger: LedgerState;
  /** Bagian yang boleh dilihat pengguna ini (hak akses Invoice & Pembayaran dan Keuangan). */
  access?: { billing: boolean; finance: boolean };
}) {
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

      <PageHero
        title="Detail Pelanggan"
        icon={UserRound}
        description={<>Informasi lengkap data pelanggan, foto, dan riwayat pembayaran.</>}
        actions={
          <>
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
          </>
        }
      />

      <section className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <EditableAvatar kind="customers" id={customer.id} name={customer.name} photo={customer.photos[0] ?? ""} />
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
              [
                "AOS",
                customer.aosUrl ? <ProofViewer entityKey="customers" id={customer.id} url={customer.aosUrl} field="aosUrl" name="AOS" label={customer.siteId || customer.name} /> : "",
              ],
              [
                "PKS",
                customer.pksUrl ? <ProofViewer entityKey="customers" id={customer.id} url={customer.pksUrl} field="pksUrl" name="PKS" label={customer.siteId || customer.name} /> : "",
              ],
            ]}
          />
        </Panel>
        <Panel icon={Wifi} title="Informasi Layanan">
          <InfoList
            items={[
              ["Kapasitas", customer.capacity],
              ["Biaya Bulanan ke ISP", customer.monthlyFee ? formatRupiah(customer.monthlyFee) : ""],
              ...(access.finance
                ? ([
                    ["Biaya Bulanan ke NAP", customer.napFee ? formatRupiah(customer.napFee) : ""],
                    ["Selisih Keuntungan", customer.monthlyFee || customer.napFee ? formatRupiah(customer.monthlyFee - customer.napFee) : ""],
                  ] as [string, string][])
                : []),
              ["No. Pembayaran", customer.paymentNumber],
              ["Vendor", customer.vendor],
              ["IP Address", customer.ipAddress],
              ["VLAN", customer.vlan],
              ["Tanggal Aktivasi", customer.activationDate ? formatDate(customer.activationDate) : ""],
              ["Status Layanan", statusPill],
              ["Nama Tower", customer.towerName],
              [
                "Lokasi Tower",
                customer.towerLat || customer.towerLng ? (
                  <a href={`https://www.google.com/maps?q=${customer.towerLat},${customer.towerLng}`} target="_blank" rel="noopener noreferrer" className="text-brand-ink underline-offset-4 hover:underline">
                    {customer.towerLat}, {customer.towerLng}
                  </a>
                ) : (
                  ""
                ),
              ],
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

      {access.billing && <InvoicePanel rows={invoices} customerId={customer.id} />}

      {access.billing && (
        <HistoryPanel
          entityKey="customer-payments"
          icon={ReceiptText}
          title="History Pembayaran Subnet"
          noun="Pembayaran"
          rows={payments}
          customerId={customer.id}
          defaults={{ amount: customer.monthlyFee || "" }}
        />
      )}

      {access.finance && (
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
      )}

      <RecordSheet entityKey="customers" value={editing} setValue={setEditing} hiddenFields={access.finance ? [] : ["napFee"]} />

      <AlertDialog open={removingPhoto !== null} onOpenChange={(open) => !open && !savingPhotos && setRemovingPhoto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin mau menghapus foto ini?</AlertDialogTitle>
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

"use client";

import { ArrowLeft, ChevronRight, ImagePlus, Images, LoaderCircle, Pencil, Plus, ReceiptText, StickyNote, Trash2, User, Wifi, X, type LucideIcon } from "lucide-react";
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
import { customerStatusLabels, paymentStatusLabels } from "@/lib/cms/entities";
import type { customerPayments, customers } from "@/lib/db/schema";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { uploadImage } from "./image-field";
import { DeleteRecordDialog, RecordSheet, type Row } from "./record-dialogs";

type Customer = typeof customers.$inferSelect;
type Payment = typeof customerPayments.$inferSelect;

const listPath = "/admin/data/customers";
/** Sisi terpanjang foto setelah diperkecil di peramban, agar foto kamera ponsel lolos batas unggah 4 MB. */
const maxPhotoSide = 1920;

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

/** Memperkecil foto besar menjadi JPEG; bila gagal (format tak didukung peramban), berkas asli dipakai. */
async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxPhotoSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function StatusPill({ tone, children }: { tone: "good" | "muted" | "warn"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "good" && "bg-emerald-50 text-emerald-700",
        tone === "warn" && "bg-amber-50 text-amber-700",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone === "good" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-muted-foreground/60")} aria-hidden="true" />
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

/** Halaman detail satu pelanggan: profil, layanan, foto, dan riwayat pembayaran. */
export function CustomerDetail({ customer, payments }: { customer: Customer; payments: Payment[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [payment, setPayment] = useState<Row | null>(null);
  const [removingPayment, setRemovingPayment] = useState<Row | null>(null);
  const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingPhotos, startSavingPhotos] = useTransition();

  const statusPill = (
    <StatusPill tone={customer.status === "active" ? "good" : "muted"}>{customerStatusLabels[customer.status] ?? customer.status}</StatusPill>
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
      const url = await uploadImage(await shrinkPhoto(file));
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
              ["Biaya Bulanan", customer.monthlyFee ? formatRupiah(customer.monthlyFee) : ""],
              ["No. Pembayaran", customer.paymentNumber],
              ["Vendor", customer.vendor],
              ["IP Address", customer.ipAddress],
              ["Tanggal Aktivasi", customer.activationDate ? formatDate(customer.activationDate) : ""],
              ["Status Layanan", statusPill],
            ]}
          />
        </Panel>
      </div>

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
              accept="image/jpeg,image/png,image/webp,image/avif"
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

      <Panel
        icon={ReceiptText}
        title="History Pembayaran"
        action={
          <Button
            variant="outline"
            onClick={() =>
              setPayment({
                customerId: customer.id,
                period: today().slice(0, 7),
                paidDate: today(),
                amount: customer.monthlyFee || "",
                method: payments[0]?.method ?? "",
                status: "paid",
              })
            }
          >
            <Plus />
            Tambah Pembayaran
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-5">No</TableHead>
              <TableHead>Bulan</TableHead>
              <TableHead>Tanggal Bayar</TableHead>
              <TableHead>Nominal</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 pr-5 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="pl-5 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {formatMonth(item.period)}
                  {item.note && <span className="block max-w-56 truncate text-xs font-normal text-muted-foreground">{item.note}</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{item.paidDate ? formatDate(item.paidDate) : "—"}</TableCell>
                <TableCell className="font-medium whitespace-nowrap tabular-nums">{formatRupiah(item.amount)}</TableCell>
                <TableCell>{item.method || "—"}</TableCell>
                <TableCell>
                  <StatusPill tone={item.status === "paid" ? "good" : "warn"}>{paymentStatusLabels[item.status] ?? item.status}</StatusPill>
                </TableCell>
                <TableCell className="pr-4 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon-sm" onClick={() => setPayment({ ...item })} aria-label={`Ubah pembayaran ${formatMonth(item.period)}`}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemovingPayment(item)}
                    aria-label={`Hapus pembayaran ${formatMonth(item.period)}`}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  Belum ada pembayaran yang dicatat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <RecordSheet entityKey="customers" value={editing} setValue={setEditing} />
      <RecordSheet entityKey="customer-payments" value={payment} setValue={setPayment} hiddenFields={["customerId"]} />
      <DeleteRecordDialog
        entityKey="customer-payments"
        row={removingPayment}
        title={removingPayment ? `Pembayaran ${formatMonth(String(removingPayment.period))}` : ""}
        onClose={() => setRemovingPayment(null)}
      />

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

"use client";

import { Check, CircleDot, LoaderCircle, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { advanceMetroStepAction, createMetroOrderAction, deleteMetroOrderAction, rejectMetroOrderAction, reopenMetroOrderAction, undoMetroStepAction } from "@/app/admin/metro-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MetroStepRecord } from "@/lib/db/schema";
import type { SaveResult } from "@/lib/cms/store";
import { formatStepTime, metroKindLabels, metroProgress, toWitaInput, type MetroKind, type MetroStatus } from "@/lib/metro";
import { cn } from "@/lib/utils";

export type MetroCustomerOption = { id: string; title: string; capacity: string };
export type MetroOrderView = { id: string; kind: MetroKind; capacity: string; previousCapacity: string; steps: Record<string, MetroStepRecord>; status: MetroStatus; rejectReason: string; note: string };

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<SaveResult>, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onDone?.();
      router.refresh();
    });
  return { pending, run };
}

/** Tombol "Buat progres": pemasangan baru (langkah Registrasi) atau upgrade yang diminta lewat admin. */
export function CreateMetroButton({ customers }: { customers: MetroCustomerOption[] }) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [kind, setKind] = useState<MetroKind>("install");
  const [capacity, setCapacity] = useState("");
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");
  const { pending, run } = useAction();

  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          setCustomerId("");
          setKind("install");
          setCapacity("");
          setAt(toWitaInput(new Date()));
          setNote("");
          setOpen(true);
        }}
      >
        <Plus />
        Buat progres
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Progres Metro</DialogTitle>
            <DialogDescription>Pelanggan melihat progres ini di portal Subnet (menu Progres Metro). Pastikan pelanggan sudah punya akses Subnet.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => createMetroOrderAction({ customerId, kind, capacity, at, note }), () => setOpen(false));
            }}
          >
            <div className="flex flex-col gap-2">
              <Label>Pelanggan</Label>
              <Select
                value={customerId}
                onValueChange={(value) => {
                  setCustomerId(value);
                  if (kind === "install") setCapacity(customers.find((customer) => customer.id === value)?.capacity ?? "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Jenis</Label>
                <Select value={kind} onValueChange={(value) => setKind(value as MetroKind)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="install">{metroKindLabels.install}</SelectItem>
                    <SelectItem value="upgrade">{metroKindLabels.upgrade}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="metro-capacity">{kind === "upgrade" ? "Kapasitas baru" : "Kapasitas"}</Label>
                <Input id="metro-capacity" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="mis. 100 Mbps" maxLength={40} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="metro-at">Waktu {kind === "upgrade" ? "permintaan" : "registrasi"} (WITA)</Label>
              <Input id="metro-at" type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="metro-note">Catatan (opsional, terlihat pelanggan)</Label>
              <Textarea id="metro-note" rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending || !customerId}>
                {pending && <LoaderCircle className="animate-spin" />}
                Buat progres
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tombol "Kelola" per progres: menandai langkah berikutnya selesai, membatalkan, menolak, atau menghapus. */
export function MetroOrderButton({ order, customerTitle }: { order: MetroOrderView; customerTitle: string }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, run } = useAction();
  const progress = metroProgress(order.kind, order.steps);
  const rejected = order.status === "rejected";

  return (
    <>
      <Button
        variant={progress.next && !rejected ? "default" : "outline"}
        size="sm"
        onClick={() => {
          setAt(toWitaInput(new Date()));
          setNote("");
          setRejecting(false);
          setReason("");
          setConfirmDelete(false);
          setOpen(true);
        }}
      >
        Kelola
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{customerTitle}</DialogTitle>
            <DialogDescription>
              {metroKindLabels[order.kind]}
              {order.kind === "upgrade" ? ` · ${order.previousCapacity || "?"} → ${order.capacity}` : order.capacity ? ` · ${order.capacity}` : ""}
            </DialogDescription>
          </DialogHeader>

          {order.note && <p className="rounded-lg bg-muted px-3 py-2 text-sm">Catatan pelanggan: {order.note}</p>}

          <ol className="flex flex-col gap-0.5">
            {progress.steps.map((step) => (
              <li key={step.key} className={cn("flex items-start gap-3 rounded-lg px-2 py-1.5 text-sm", step.state === "current" && !rejected && "bg-brand-soft")}>
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                    step.state === "done" ? "bg-emerald-500 text-white" : step.state === "current" && !rejected ? "bg-brand text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.state === "done" ? <Check className="size-3" /> : <CircleDot className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{step.label}</span>
                  {step.record && (
                    <span className="block text-xs text-muted-foreground">
                      {formatStepTime(step.record.at)} · {step.record.by}
                      {step.record.note && ` · ${step.record.note}`}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>

          {rejected ? (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p>
                <span className="font-medium text-destructive">Ditolak:</span> {order.rejectReason}
              </p>
              <Button variant="outline" size="sm" className="self-start" disabled={pending} onClick={() => run(() => reopenMetroOrderAction(order.id))}>
                <RotateCcw />
                Buka kembali
              </Button>
            </div>
          ) : progress.next ? (
            <form
              className="flex flex-col gap-3 rounded-lg border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                run(() => advanceMetroStepAction(order.id, { at, note }), () => setNote(""));
              }}
            >
              <p className="text-sm font-medium">Langkah berikutnya: {progress.next.label}</p>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`at-${order.id}`} className="text-xs">
                    Waktu selesai (WITA)
                  </Label>
                  <Input id={`at-${order.id}`} type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`note-${order.id}`} className="text-xs">
                    Catatan (opsional, terlihat pelanggan)
                  </Label>
                  <Input id={`note-${order.id}`} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
                </div>
              </div>
              {progress.next.key === "done" && order.kind === "upgrade" && <p className="text-xs text-muted-foreground">Kapasitas di Data Pelanggan akan diganti menjadi {order.capacity}.</p>}
              <Button type="submit" disabled={pending} className="self-start">
                {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
                Tandai &ldquo;{progress.next.label}&rdquo; selesai
              </Button>
            </form>
          ) : (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Semua langkah selesai.</p>
          )}

          {rejecting && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`reason-${order.id}`}>Alasan penolakan (terlihat pelanggan)</Label>
              <Textarea id={`reason-${order.id}`} rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => rejectMetroOrderAction(order.id, reason), () => setRejecting(false))}>
                  Tolak pengajuan
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                  Batal
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {progress.completed > 1 && !rejected && (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => undoMetroStepAction(order.id))}>
                  <RotateCcw />
                  Batalkan langkah terakhir
                </Button>
              )}
              {order.status === "active" && !rejecting && (
                <Button variant="outline" size="sm" onClick={() => setRejecting(true)}>
                  <X />
                  Tolak
                </Button>
              )}
            </div>
            {confirmDelete ? (
              <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => deleteMetroOrderAction(order.id), () => setOpen(false))}>
                Yakin hapus?
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 />
                Hapus
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { CloudUpload, FileCheck2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { uploadPaymentProofAction } from "@/app/subnet/actions";
import { Button } from "@/components/ui/button";

/** Tombol/borang unggah bukti transfer untuk satu invoice yang belum lunas, dengan keterangan opsional. */
export function PaymentProofUpload({ invoiceId, uploaded }: { invoiceId: string; uploaded: { proofUrl: string } | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    formData.set("invoiceId", invoiceId);
    const file = formData.get("proof");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Pilih berkas bukti transfer.");
      return;
    }
    start(async () => {
      const result = await uploadPaymentProofAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (uploaded && !open) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 pb-3 text-xs sm:px-5">
        <span className="flex items-center gap-1.5 font-medium text-emerald-600">
          <FileCheck2 className="size-4" /> Bukti terkirim · menunggu verifikasi
        </span>
        <div className="flex items-center gap-3">
          <a href={uploaded.proofUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-ink hover:underline">
            Lihat
          </a>
          <button type="button" onClick={() => setOpen(true)} className="font-medium text-muted-foreground hover:text-foreground">
            Ganti
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="px-4 pb-3 sm:px-5">
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
          <CloudUpload /> Upload bukti transfer
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-2 px-4 pb-3 sm:px-5">
      <input
        type="file"
        name="proof"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        required
        className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
      />
      <textarea
        name="note"
        rows={2}
        maxLength={500}
        placeholder="Keterangan (opsional) — mis. Transfer BNI a.n. Budi, 20 Nov"
        className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
      />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" size="sm" className="flex-1" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <CloudUpload />} Kirim bukti
        </Button>
      </div>
    </form>
  );
}

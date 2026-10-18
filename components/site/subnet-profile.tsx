"use client";

import { Camera, LoaderCircle, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSubnetAddressAction, updateSubnetPhotoAction } from "@/app/subnet/actions";
import { initials } from "@/components/admin/detail-panels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Sisi terpanjang foto profil setelah diperkecil; cukup tajam untuk avatar dan jauh di bawah batas unggah. */
const photoSize = 640;

/** Memperkecil foto di perangkat menjadi JPEG, supaya foto kamera HP yang besar tetap bisa diunggah. */
async function shrinkPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, photoSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Foto tidak bisa diproses.");
  return new File([blob], "profil.jpg", { type: "image/jpeg" });
}

/** Foto profil pelanggan dengan tombol untuk menggantinya. */
export function SubnetPhoto({ photoUrl, name }: { photoUrl: string; name: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    startTransition(async () => {
      try {
        const body = new FormData();
        body.set("photo", await shrinkPhoto(file));
        const result = await updateSubnetPhotoAction(body);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        router.refresh();
      } catch {
        toast.error("Foto tidak bisa dibaca. Coba foto lain dengan format JPG atau PNG.");
      }
    });
  }

  return (
    <div className="relative size-20 shrink-0">
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-brand-soft text-2xl font-semibold text-brand-ink">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={`Foto ${name}`} className="size-full object-cover" />
        ) : (
          initials(name)
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="absolute -right-1 -bottom-1 rounded-full bg-background text-foreground shadow-sm"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label="Ganti foto profil"
        title="Ganti foto profil"
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Camera />}
      </Button>
    </div>
  );
}

export type SubnetAddress = { address: string; district: string; regency: string; province: string };

/** Tombol "Ubah Alamat" dan form-nya. */
export function SubnetAddressButton({ value }: { value: SubnetAddress }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(value);
  const [pending, startTransition] = useTransition();
  const field = (key: keyof SubnetAddress) => ({ value: form[key], onChange: (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value }) });

  function save() {
    startTransition(async () => {
      const result = await updateSubnetAddressAction(form);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setForm(value);
          setOpen(true);
        }}
      >
        <Pencil />
        {value.address ? "Ubah Alamat" : "Isi Alamat"}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ubah Alamat</DialogTitle>
            <DialogDescription>Alamat lokasi layanan Anda. Perubahan langsung tersimpan di data pelanggan TLINET.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="subnet-address">Alamat lengkap</Label>
              <Textarea id="subnet-address" rows={3} maxLength={500} required {...field("address")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="subnet-district">Kecamatan</Label>
                <Input id="subnet-district" maxLength={100} {...field("district")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subnet-regency">Kabupaten</Label>
                <Input id="subnet-regency" maxLength={100} {...field("regency")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subnet-province">Provinsi</Label>
                <Input id="subnet-province" maxLength={100} {...field("province")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <LoaderCircle className="animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

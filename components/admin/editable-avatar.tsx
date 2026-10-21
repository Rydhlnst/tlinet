"use client";

import { LoaderCircle, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { setProfilePhotoAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import { initials } from "./detail-panels";
import { uploadImage } from "./image-field";

/**
 * Foto profil besar di halaman detail admin. Diarahkan kursor, muncul ikon edit di atas foto; klik untuk memilih foto
 * baru (dikompres sebelum diunggah). Di HP ikon edit kecil selalu tampil di pojok karena tidak ada hover.
 */
export function EditableAvatar({ kind, id, name, photo, className }: { kind: "customers" | "data-centers"; id: string; name: string; photo: string; className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function change(file: File) {
    setBusy(true);
    const url = await uploadImage(file);
    if (url) {
      const result = await setProfilePhotoAction(kind, id, url);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={`Ganti foto profil ${name}`}
        title="Ganti foto profil"
        className={cn(
          "group relative flex size-20 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl font-semibold text-brand-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className,
        )}
      >
        <span className="flex size-full items-center justify-center overflow-hidden rounded-full">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={`Foto ${name}`} className="size-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        {/* Lapisan gelap dengan ikon edit saat diarahkan kursor atau difokuskan. */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity",
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          aria-hidden="true"
        >
          {busy ? <LoaderCircle className="size-6 animate-spin" /> : <Pencil className="size-6" />}
        </span>
        {/* Penanda edit untuk layar sentuh. */}
        <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm md:hidden" aria-hidden="true">
          <Pencil className="size-3.5" />
        </span>
      </button>
      {/* Di luar tombol: klik pada input tidak boleh merambat kembali ke tombolnya. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void change(file);
        }}
      />
    </>
  );
}

"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { requestUpgradeAction } from "@/app/subnet/actions";
import { Textarea } from "@/components/ui/textarea";
import { capacityLabel } from "@/lib/metro";
import { cn } from "@/lib/utils";

/** Form pengajuan upgrade: pilih kapasitas baru, catatan opsional, lalu kirim ke admin. */
export function UpgradeRequestForm({ options, current }: { options: number[]; current: string }) {
  const router = useRouter();
  const [mbps, setMbps] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4 px-5 pb-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!mbps) return;
        startTransition(async () => {
          const result = await requestUpgradeAction({ mbps, note });
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          setMbps(null);
          setNote("");
          router.refresh();
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Kapasitas sekarang <span className="font-semibold text-foreground">{current || "—"}</span>. Pilih kapasitas baru:
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Kapasitas baru">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mbps === option}
            onClick={() => setMbps(option)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-sm font-semibold tabular-nums transition-colors",
              mbps === option ? "border-ink bg-ink text-white" : "bg-background hover:border-foreground/30",
            )}
          >
            {capacityLabel(option)}
          </button>
        ))}
      </div>
      <Textarea rows={2} maxLength={300} placeholder="Catatan untuk tim kami (opsional)" value={note} onChange={(event) => setNote(event.target.value)} className="rounded-2xl" />
      <button
        type="submit"
        disabled={!mbps || pending}
        className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {mbps ? `Ajukan upgrade ke ${capacityLabel(mbps)}` : "Pilih kapasitas dulu"}
      </button>
    </form>
  );
}

"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Tombol kecil untuk menyalin teks, mis. nomor rekening. */
export function CopyButton({ value, label = "Salin", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Disalin.");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Tidak bisa menyalin. Tekan lama teksnya untuk menyalin.");
        }
      }}
      className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", className)}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Disalin" : label}
    </button>
  );
}

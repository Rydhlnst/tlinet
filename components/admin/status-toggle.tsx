"use client";

import { CircleCheck, LoaderCircle, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { setRecordStatusAction } from "@/app/admin/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Data dengan status pembayaran yang bisa ditandai lunas dengan satu klik dari daftar. */
export const statusToggleEntities = ["invoices", "customer-payments", "customer-purchases", "salaries", "data-center-payments"];

const words: Record<string, { paid: string; unpaid: string; sync?: string }> = {
  invoices: { paid: "Paid", unpaid: "Unpaid", sync: "History Pembayaran Subnet ikut diperbarui." },
  "customer-payments": { paid: "Lunas", unpaid: "Belum lunas", sync: "Invoice-nya ikut diperbarui." },
  "customer-purchases": { paid: "Lunas", unpaid: "Belum lunas" },
  salaries: { paid: "Sudah dibayar", unpaid: "Belum dibayar" },
  "data-center-payments": { paid: "Lunas", unpaid: "Belum lunas" },
};

/**
 * Label status yang bisa diklik: membuka pilihan "Tandai Paid/Lunas" (atau sebaliknya). Invoice dan History Pembayaran
 * Subnet saling mengikuti, dan tanggal bayar yang kosong diisi hari ini.
 */
export function StatusToggle({ entityKey, id, status, children }: { entityKey: string; id: string; status: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const label = words[entityKey];
  if (!label) return <>{children}</>;
  const paid = status === "paid";
  const next = paid ? "unpaid" : "paid";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        // Baris tabel di sekitarnya punya aksi klik sendiri (buka detail atau form).
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Ubah status" disabled={pending}>
          {children}
          {pending && <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60" onClick={(event) => event.stopPropagation()}>
        {label.sync && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{label.sync}</DropdownMenuLabel>}
        <DropdownMenuItem
          onSelect={() =>
            startTransition(async () => {
              const result = await setRecordStatusAction(entityKey, id, next);
              if (result.ok) {
                toast.success(result.message);
                router.refresh();
              } else toast.error(result.message);
            })
          }
        >
          {paid ? <Undo2 /> : <CircleCheck className="text-emerald-600" />}
          Tandai {paid ? label.unpaid : label.paid}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

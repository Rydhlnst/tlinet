"use client";

import { CalendarPlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generateNextMonthAction } from "@/app/admin/actions";
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
import type { EntityDef } from "@/lib/cms/entities";
import { planNextMonth } from "@/lib/cms/monthly";
import { formatMonth } from "@/lib/format";
import type { Row } from "./record-dialogs";

/**
 * Tombol "Generate Tagihan <bulan>": menyalin tagihan bulan terakhir ke bulan berikutnya setelah dikonfirmasi.
 * Dengan `customerId`, `rows` berisi tagihan satu pelanggan saja dan hanya tagihan pelanggan itu yang dibuat.
 */
export function MonthlyGenerate({
  entityKey,
  monthly,
  rows,
  customerId = "",
  size = "lg",
  className,
}: {
  entityKey: string;
  monthly: NonNullable<EntityDef["monthly"]>;
  rows: Row[];
  customerId?: string;
  size?: "default" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const plan = planNextMonth(monthly, rows);
  if (!plan) return null;
  const target = formatMonth(plan.target);
  const count = plan.toCreate.length;

  function generate() {
    startTransition(async () => {
      const result = await generateNextMonthAction(entityKey, plan!.source, customerId);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return (
    <>
      <Button variant="outline" size={size} className={className} onClick={() => setOpen(true)}>
        <CalendarPlus />
        Generate Tagihan {target}
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate tagihan {target}?</AlertDialogTitle>
            <AlertDialogDescription>
              {count > 0
                ? `${count} tagihan ${target} akan dibuat dari tagihan ${formatMonth(plan.source)}. ${monthly.note}`
                : `Semua tagihan ${formatMonth(plan.source)} sudah punya tagihan ${target}. Tidak ada yang perlu dibuat.`}
              {plan.skipped > 0 && count > 0 && ` ${plan.skipped} tagihan yang sudah ada di ${target} dilewati.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            {count > 0 && (
              <AlertDialogAction
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault();
                  generate();
                }}
              >
                {pending && <LoaderCircle className="animate-spin" />}
                Buat {count} tagihan
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { importAccurateCustomersAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** Tombol impor pelanggan Accurate ke Data Pelanggan; aman diulang karena yang sudah tertaut dilewati. */
export function AccurateImportButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await importAccurateCustomersAction();
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <Download />}
      {pending ? "Mengimpor…" : "Impor pelanggan dari Accurate"}
    </Button>
  );
}

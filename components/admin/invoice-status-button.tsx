"use client";

import { CircleCheck, LoaderCircle, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { setInvoiceStatusAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** Tombol di atas lembar invoice untuk menandainya lunas atau mengembalikannya ke belum lunas. */
export function InvoiceStatusButton({ id, paid }: { id: string; paid: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setInvoiceStatusAction(id, paid ? "unpaid" : "paid");
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Button variant="outline" size="lg" className="bg-background" onClick={toggle} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : paid ? <Undo2 /> : <CircleCheck />}
      {paid ? "Tandai Belum Lunas" : "Tandai Lunas"}
    </Button>
  );
}

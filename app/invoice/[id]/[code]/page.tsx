import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FitToWidth } from "@/components/admin/fit-to-width";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { PrintButton } from "@/components/admin/print-button";
import { AppStatusBar } from "@/components/site/app-status-bar";
import { Badge } from "@/components/ui/badge";
import { linkCodeMatches } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { invoices } from "@/lib/db/schema";

/** Invoice hanya ditemukan bila kode di tautannya cocok, jadi id saja tidak cukup untuk membukanya. */
const findInvoice = cache(async (id: string, code: string) => {
  if (!linkCodeMatches(`invoice:${id}`, code)) return undefined;
  return (await requireDb().select().from(invoices).where(eq(invoices.id, id)).limit(1))[0];
});

// Judul halaman menjadi nama berkas saat invoice disimpan sebagai PDF. Tautannya rahasia: tidak diindeks dan tidak dikirim sebagai referrer.
export async function generateMetadata({ params }: PageProps<"/invoice/[id]/[code]">): Promise<Metadata> {
  const { id, code } = await params;
  const invoice = await findInvoice(id, code);
  return { title: { absolute: invoice ? `Invoice ${invoice.number}` : "Invoice" }, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/** Invoice untuk pelanggan, dibuka dari tautan di pesan WhatsApp: bisa dilihat di HP dan disimpan sebagai PDF. */
export default async function PublicInvoicePage({ params }: PageProps<"/invoice/[id]/[code]">) {
  const { id, code } = await params;
  const [invoice, settings] = await Promise.all([findInvoice(id, code), getContent("invoice")]);
  if (!invoice) notFound();
  const paid = invoice.status === "paid";

  return (
    <main className="pt-safe flex-1 bg-muted print:bg-white">
      <AppStatusBar style="LIGHT" />
      <div className="mx-auto flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-3 px-3 py-4 print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold">Invoice {invoice.number}</h1>
          <Badge variant={paid ? "default" : "secondary"}>{paid ? "Paid" : "Unpaid"}</Badge>
        </div>
        <PrintButton />
      </div>
      <div className="px-2 pb-10 print:p-0">
        <FitToWidth width={794}>
          <InvoiceDocument invoice={invoice} settings={settings} />
        </FitToWidth>
      </div>
    </main>
  );
}

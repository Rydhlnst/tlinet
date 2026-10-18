import { eq } from "drizzle-orm";
import { ArrowLeft, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { InvoiceStatusButton } from "@/components/admin/invoice-status-button";
import { PrintButton } from "@/components/admin/print-button";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { invoiceWhatsappUrl } from "@/lib/invoices";

const findInvoice = async (id: string) => (await requireDb().select().from(invoices).where(eq(invoices.id, id)).limit(1))[0];

// Judul halaman menjadi nama berkas saat invoice disimpan sebagai PDF.
export async function generateMetadata({ params }: PageProps<"/admin/invoice/[id]">): Promise<Metadata> {
  await requireAdmin("billing");
  const invoice = await findInvoice((await params).id);
  return { title: invoice ? `Invoice ${invoice.number}` : "Invoice", robots: { index: false } };
}

/** Invoice siap cetak. Berdiri di luar kerangka dashboard supaya yang tercetak hanya lembar invoicenya. */
export default async function InvoicePage({ params }: PageProps<"/admin/invoice/[id]">) {
  await requireAdmin("billing");
  const [invoice, settings] = await Promise.all([findInvoice((await params).id), getContent("invoice")]);
  if (!invoice) notFound();
  const whatsapp = invoiceWhatsappUrl(invoice, settings);

  return (
    <div className="flex-1 bg-muted print:bg-white">
      <div className="mx-auto flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-3 px-3 py-4 print:hidden">
        <Button asChild variant="outline" size="lg" className="bg-background">
          <Link href="/admin/data/invoices">
            <ArrowLeft />
            Kembali ke Invoice
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="lg" className="bg-background">
            <Link href="/admin/pages/invoice">
              <Settings />
              Pengaturan Invoice
            </Link>
          </Button>
          <InvoiceStatusButton id={invoice.id} paid={invoice.status === "paid"} />
          {whatsapp && (
            <Button asChild variant="outline" size="lg" className="bg-background">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="text-[#1fa855]" />
                WhatsApp
              </a>
            </Button>
          )}
          <PrintButton />
        </div>
      </div>
      <div className="overflow-x-auto pb-10 print:overflow-visible print:pb-0">
        <InvoiceDocument invoice={invoice} settings={settings} />
      </div>
    </div>
  );
}

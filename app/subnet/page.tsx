import { desc, eq } from "drizzle-orm";
import { FileText, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/site/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { formatDate, formatRupiah } from "@/lib/format";
import { invoicePublicPath } from "@/lib/invoices";
import { requireSubnetUser } from "@/lib/subnet";
import { cn } from "@/lib/utils";
import { subnetLogoutAction } from "./actions";

export const metadata: Metadata = { title: "Portal Subnet", robots: { index: false } };

/** Tanggal hari ini (YYYY-MM-DD) menurut WITA, zona waktu kantor di Bulukumba. */
const todayWita = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "due" }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums", tone === "due" && "text-destructive")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Beranda portal pelanggan: semua invoice miliknya dari menu Invoice, terbaru lebih dulu. */
export default async function SubnetHomePage() {
  const user = await requireSubnetUser();
  const [settings, invoiceSettings, list] = await Promise.all([
    getContent("settings"),
    getContent("invoice"),
    requireDb().select().from(invoices).where(eq(invoices.customerId, user.customerId)).orderBy(desc(invoices.issueDate), desc(invoices.number)),
  ]);

  const today = todayWita();
  const unpaid = list.filter((invoice) => invoice.status !== "paid");
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + invoice.total, 0);
  const hasBank = Boolean(invoiceSettings.bankName && invoiceSettings.bankAccountNumber);

  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label={settings.brandName}>
            <Brand name={settings.brandName} highlight={settings.brandHighlight} logoUrl={settings.logoUrl} />
          </Link>
          <form action={subnetLogoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut />
              Keluar
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Portal Subnet</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{user.company || user.name}</h1>
          {user.company && <p className="mt-1 text-sm text-muted-foreground">{user.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Belum dibayar"
            value={formatRupiah(unpaidTotal)}
            hint={unpaid.length ? `${unpaid.length} invoice unpaid` : "Semua invoice sudah dibayar"}
            tone={unpaid.length ? "due" : undefined}
          />
          <Stat label="Total invoice" value={String(list.length)} hint={`${list.length - unpaid.length} sudah dibayar`} />
        </div>

        {unpaid.length > 0 && hasBank && (
          <div className="rounded-2xl border bg-card p-5 text-sm">
            <p className="font-medium">Pembayaran dapat ditransfer ke:</p>
            <p className="mt-2">
              Rekening {invoiceSettings.bankName}: <span className="font-semibold tabular-nums">{invoiceSettings.bankAccountNumber}</span>
            </p>
            {invoiceSettings.bankAccountHolder && <p className="text-muted-foreground">a.n. {invoiceSettings.bankAccountHolder}</p>}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border bg-card">
          <h2 className="border-b px-5 py-4 font-semibold">Invoice</h2>
          {list.length ? (
            <ul className="divide-y">
              {list.map((invoice) => {
                const paid = invoice.status === "paid";
                const overdue = !paid && invoice.dueDate < today;
                const items = invoice.items.map((item) => item.description.trim()).filter(Boolean).join(", ");
                return (
                  <li key={invoice.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{invoice.number}</p>
                        <Badge variant={paid ? "default" : overdue ? "destructive" : "secondary"}>{paid ? "Paid" : overdue ? "Lewat jatuh tempo" : "Unpaid"}</Badge>
                      </div>
                      {items && <p className="mt-1 truncate text-sm text-muted-foreground">{items}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Terbit {formatDate(invoice.issueDate)} · Jatuh tempo {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="font-semibold whitespace-nowrap tabular-nums">{formatRupiah(invoice.total)}</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href={invoicePublicPath(invoice.id)}>
                          <FileText />
                          Lihat / Unduh
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada invoice.</p>
          )}
        </section>
      </main>
    </div>
  );
}

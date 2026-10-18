import { count, isNotNull } from "drizzle-orm";
import { ArrowRight, CircleAlert, CircleCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccurateImportButton } from "@/components/admin/accurate-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accurateMode, accurateWriteEnabled, getAccurateDatabase } from "@/lib/accurate";
import { accurateModules, accurateWebUrl } from "@/lib/accurate-features";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Pencatatan Accurate" };

/** Status koneksi untuk kartu atas; galat dari Accurate ditampilkan apa adanya agar mudah ditindaklanjuti. */
async function connection(): Promise<{ ok: boolean; title: string; detail: string; host?: string }> {
  if (accurateMode === "off") {
    return { ok: false, title: "Belum terhubung", detail: "Isi ACCURATE_API_TOKEN dan ACCURATE_SIGNATURE_SECRET di environment untuk menghubungkan dashboard ke Accurate Online." };
  }
  if (accurateMode === "incomplete") {
    return { ok: false, title: "Kredensial belum lengkap", detail: "ACCURATE_API_TOKEN dan ACCURATE_SIGNATURE_SECRET harus diisi dua-duanya." };
  }
  try {
    const database = await getAccurateDatabase(true);
    return { ok: true, title: `Terhubung ke ${database.name}`, detail: database.host, host: database.host };
  } catch (error) {
    return { ok: false, title: "Accurate menolak koneksi", detail: error instanceof Error ? error.message : "Accurate tidak dapat dijangkau." };
  }
}

export default async function AccuratePage() {
  await requireAdmin("accurate");
  const [status, [linked]] = await Promise.all([connection(), requireDb().select({ value: count() }).from(customers).where(isNotNull(customers.accurateId))]);
  const openUrl = status.host ?? accurateWebUrl;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pencatatan Accurate</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pembukuan dikelola di Accurate Online. Dashboard menampilkan datanya per modul di bawah ini dan di menu Accurate pada sidebar.
          </p>
        </div>
        <Button asChild size="lg">
          <a href={openUrl} target="_blank" rel="noopener noreferrer">
            Buka Accurate
            <ExternalLink />
          </a>
        </Button>
      </div>

      <section className="flex gap-3 rounded-xl border bg-card p-5">
        {status.ok ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{status.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed break-words text-muted-foreground">{status.detail}</p>
          {status.ok && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {accurateWriteEnabled
                ? "Form input aktif: data yang ditambahkan dari halaman modul langsung tersimpan di pembukuan Accurate."
                : "Mode hanya baca: dashboard menampilkan data Accurate tanpa bisa mengubahnya. Form input aktif bila ACCURATE_WRITE=on."}
            </p>
          )}
          {status.ok && (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{linked.value} pelanggan</span> di{" "}
                <Link href="/admin/data/customers" className="font-medium text-brand-ink underline-offset-4 hover:underline">
                  Data Pelanggan
                </Link>{" "}
                tertaut ke Accurate. Impor hanya menambah pelanggan yang belum ada dan tidak mengubah apa pun di Accurate.
              </p>
              <AccurateImportButton />
            </div>
          )}
        </div>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accurateModules.map(({ key, label, icon: Icon, description, resources, report }) => (
          <li key={key}>
            <Link
              href={`/admin/accurate/${key}`}
              className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                  <Icon className="size-5" />
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {resources.map((resource) => (
                  <Badge key={resource.key} variant="secondary">
                    {resource.label}
                  </Badge>
                ))}
                {report && <Badge variant="secondary">Neraca & Laba Rugi</Badge>}
                {!report && resources.length === 0 && <Badge variant="outline">Hanya di Accurate</Badge>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
